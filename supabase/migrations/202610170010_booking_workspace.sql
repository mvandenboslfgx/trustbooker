-- Transaction workspace: booking state, participant chat and disputes.

create unique index if not exists conversations_booking_unique_idx
  on public.conversations(booking_id)
  where booking_id is not null;

create or replace function public.ensure_booking_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation_id uuid;
  v_provider_user_id uuid;
begin
  select owner_user_id into v_provider_user_id
  from public.provider_profiles
  where id = new.provider_id;

  insert into public.conversations (booking_id)
  values (new.id)
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  values
    (v_conversation_id, new.buyer_id),
    (v_conversation_id, v_provider_user_id)
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.ensure_booking_conversation() from public;

drop trigger if exists booking_conversation_after_insert on public.bookings;
create trigger booking_conversation_after_insert
after insert on public.bookings
for each row execute function public.ensure_booking_conversation();

-- Backfill booking conversations created before the trigger existed.
insert into public.conversations (booking_id)
select b.id
from public.bookings b
where not exists (
  select 1 from public.conversations c where c.booking_id = b.id
);

insert into public.conversation_members (conversation_id, user_id)
select c.id, b.buyer_id
from public.conversations c
join public.bookings b on b.id = c.booking_id
on conflict do nothing;

insert into public.conversation_members (conversation_id, user_id)
select c.id, p.owner_user_id
from public.conversations c
join public.bookings b on b.id = c.booking_id
join public.provider_profiles p on p.id = b.provider_id
on conflict do nothing;

-- Replace proposal acceptance so internal markets can book without pretending a
-- payment occurred, while payment-enabled markets stop at payment_pending.
create or replace function public.accept_proposal_and_create_booking(p_proposal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.service_requests%rowtype;
  v_proposal public.proposals%rowtype;
  v_booking_id uuid;
  v_fee bigint;
  v_booking_enabled boolean;
  v_payments_enabled boolean;
  v_initial_status public.booking_status;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_proposal
  from public.proposals
  where id = p_proposal_id
  for update;

  if not found then
    raise exception 'proposal not found' using errcode = 'P0002';
  end if;

  select * into v_request
  from public.service_requests
  where id = v_proposal.request_id
  for update;

  if not found or v_request.buyer_id <> v_user_id then
    raise exception 'proposal not owned by buyer' using errcode = '42501';
  end if;

  if v_request.status not in ('open', 'matched') or v_proposal.status <> 'sent' then
    raise exception 'proposal is not available' using errcode = '22023';
  end if;

  select booking_enabled, payments_enabled
  into v_booking_enabled, v_payments_enabled
  from public.country_launches
  where country_code = v_request.country_code;

  if coalesce(v_booking_enabled, false) = false then
    raise exception 'bookings are not enabled in this country' using errcode = '55000';
  end if;

  v_fee := round(v_proposal.amount_minor::numeric * 0.10)::bigint;
  v_initial_status := case
    when coalesce(v_payments_enabled, false) then 'payment_pending'::public.booking_status
    else 'booked'::public.booking_status
  end;

  insert into public.bookings (
    buyer_id,
    provider_id,
    request_id,
    proposal_id,
    status,
    subtotal_minor,
    marketplace_fee_minor,
    currency,
    scope_snapshot
  ) values (
    v_user_id,
    v_proposal.provider_id,
    v_request.id,
    v_proposal.id,
    v_initial_status,
    v_proposal.amount_minor,
    v_fee,
    v_proposal.currency,
    jsonb_build_object(
      'request_title', v_request.title,
      'request_description', v_request.description,
      'proposal_message', v_proposal.message,
      'accepted_at', now()
    )
  ) returning id into v_booking_id;

  update public.proposals
  set status = case when id = v_proposal.id then 'accepted'::public.proposal_status else 'declined'::public.proposal_status end
  where request_id = v_request.id and status = 'sent';

  update public.service_requests
  set status = 'booked'
  where id = v_request.id;

  insert into public.booking_events (booking_id, actor_user_id, event_type, payload)
  values (
    v_booking_id,
    v_user_id,
    'booking.created_from_proposal',
    jsonb_build_object(
      'proposal_id', v_proposal.id,
      'subtotal_minor', v_proposal.amount_minor,
      'marketplace_fee_minor', v_fee,
      'currency', v_proposal.currency,
      'initial_status', v_initial_status
    )
  );

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'booking.created_from_proposal',
    'booking',
    v_booking_id::text,
    jsonb_build_object('proposal_id', v_proposal.id, 'request_id', v_request.id, 'initial_status', v_initial_status)
  );

  return v_booking_id;
end;
$$;

revoke all on function public.accept_proposal_and_create_booking(uuid) from public;
grant execute on function public.accept_proposal_and_create_booking(uuid) to authenticated;

create or replace function public.transition_booking(p_booking_id uuid, p_action text)
returns public.booking_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_provider_user_id uuid;
  v_new_status public.booking_status;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;

  select owner_user_id into v_provider_user_id
  from public.provider_profiles
  where id = v_booking.provider_id;

  if v_user_id <> v_booking.buyer_id and v_user_id <> v_provider_user_id then
    raise exception 'booking participant required' using errcode = '42501';
  end if;

  if p_action = 'start_work' then
    if v_user_id <> v_provider_user_id or v_booking.status <> 'booked' then
      raise exception 'provider can only start booked work' using errcode = '22023';
    end if;
    v_new_status := 'in_progress';
  elsif p_action = 'request_completion' then
    if v_user_id <> v_provider_user_id or v_booking.status <> 'in_progress' then
      raise exception 'provider can only request completion for work in progress' using errcode = '22023';
    end if;
    v_new_status := 'completion_pending';
  elsif p_action = 'confirm_completion' then
    if v_user_id <> v_booking.buyer_id or v_booking.status <> 'completion_pending' then
      raise exception 'buyer can only confirm a pending completion' using errcode = '22023';
    end if;
    v_new_status := 'completed';
  elsif p_action = 'cancel' then
    if v_booking.status not in ('accepted', 'payment_pending', 'booked') then
      raise exception 'booking can no longer be cancelled directly' using errcode = '22023';
    end if;
    v_new_status := 'cancelled';
  else
    raise exception 'invalid booking action' using errcode = '22023';
  end if;

  update public.bookings
  set status = v_new_status
  where id = p_booking_id;

  if v_new_status = 'completed' then
    update public.provider_profiles
    set completed_jobs = completed_jobs + 1
    where id = v_booking.provider_id;
  end if;

  insert into public.booking_events (booking_id, actor_user_id, event_type, payload)
  values (
    p_booking_id,
    v_user_id,
    'booking.status_changed',
    jsonb_build_object('from', v_booking.status, 'to', v_new_status, 'action', p_action)
  );

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'booking.status_changed',
    'booking',
    p_booking_id::text,
    jsonb_build_object('from', v_booking.status, 'to', v_new_status, 'action', p_action)
  );

  return v_new_status;
end;
$$;

revoke all on function public.transition_booking(uuid, text) from public;
grant execute on function public.transition_booking(uuid, text) to authenticated;

create or replace function public.open_booking_dispute(p_booking_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_provider public.provider_profiles%rowtype;
  v_disputes_enabled boolean;
  v_dispute_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  p_reason := trim(p_reason);
  if char_length(p_reason) not between 10 and 5000 then
    raise exception 'invalid dispute reason' using errcode = '22023';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;

  select * into v_provider from public.provider_profiles where id = v_booking.provider_id;
  if v_user_id <> v_booking.buyer_id and v_user_id <> v_provider.owner_user_id then
    raise exception 'booking participant required' using errcode = '42501';
  end if;

  if v_booking.status not in ('booked', 'in_progress', 'completion_pending', 'completed') then
    raise exception 'booking is not disputable' using errcode = '22023';
  end if;

  select disputes_enabled into v_disputes_enabled
  from public.country_launches
  where country_code = v_provider.country_code;

  if coalesce(v_disputes_enabled, false) = false then
    raise exception 'disputes are not enabled in this country' using errcode = '55000';
  end if;

  insert into public.disputes (booking_id, opened_by, reason)
  values (p_booking_id, v_user_id, p_reason)
  returning id into v_dispute_id;

  update public.bookings set status = 'disputed' where id = p_booking_id;

  insert into public.booking_events (booking_id, actor_user_id, event_type, payload)
  values (p_booking_id, v_user_id, 'booking.disputed', jsonb_build_object('dispute_id', v_dispute_id));

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (v_user_id, 'booking.disputed', 'booking', p_booking_id::text, jsonb_build_object('dispute_id', v_dispute_id));

  return v_dispute_id;
end;
$$;

revoke all on function public.open_booking_dispute(uuid, text) from public;
grant execute on function public.open_booking_dispute(uuid, text) to authenticated;

create or replace function public.get_booking_workspace(p_booking_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_provider public.provider_profiles%rowtype;
  v_conversation_id uuid;
  v_messages jsonb := '[]'::jsonb;
  v_dispute jsonb;
  v_actor_role text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then return null; end if;

  select * into v_provider from public.provider_profiles where id = v_booking.provider_id;

  if v_user_id = v_booking.buyer_id then
    v_actor_role := 'buyer';
  elsif v_user_id = v_provider.owner_user_id then
    v_actor_role := 'provider';
  else
    raise exception 'booking participant required' using errcode = '42501';
  end if;

  select id into v_conversation_id
  from public.conversations
  where booking_id = p_booking_id
  limit 1;

  if v_conversation_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id,
      'sender_user_id', m.sender_user_id,
      'body', m.body,
      'created_at', m.created_at
    ) order by m.created_at asc), '[]'::jsonb)
    into v_messages
    from (
      select id, sender_user_id, body, created_at
      from public.messages
      where conversation_id = v_conversation_id
      order by created_at desc
      limit 100
    ) m;
  end if;

  select jsonb_build_object(
    'id', d.id,
    'status', d.status,
    'reason', d.reason,
    'resolution_note', d.resolution_note,
    'created_at', d.created_at,
    'resolved_at', d.resolved_at
  ) into v_dispute
  from public.disputes d
  where d.booking_id = p_booking_id;

  return jsonb_build_object(
    'actor_role', v_actor_role,
    'booking', jsonb_build_object(
      'id', v_booking.id,
      'status', v_booking.status,
      'subtotal_minor', v_booking.subtotal_minor,
      'marketplace_fee_minor', v_booking.marketplace_fee_minor,
      'currency', v_booking.currency,
      'scope_snapshot', v_booking.scope_snapshot,
      'created_at', v_booking.created_at,
      'updated_at', v_booking.updated_at
    ),
    'provider', jsonb_build_object(
      'id', v_provider.id,
      'slug', v_provider.slug,
      'display_name', v_provider.display_name,
      'headline', v_provider.headline,
      'trust_score', v_provider.trust_score,
      'rating', v_provider.rating
    ),
    'conversation_id', v_conversation_id,
    'messages', v_messages,
    'dispute', v_dispute
  );
end;
$$;

revoke all on function public.get_booking_workspace(uuid) from public;
grant execute on function public.get_booking_workspace(uuid) to authenticated;
