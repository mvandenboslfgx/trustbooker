-- TrustBooker production hardening v0.3.1
-- Enforces financial invariants and provides a transaction-safe proposal acceptance flow.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','provider_profiles','services','service_requests','proposals',
    'bookings','reviews','disputes','reports','country_launches'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

alter table public.bookings
  add constraint bookings_success_fee_exact_check
  check (
    marketplace_fee_minor = round(subtotal_minor::numeric * 0.10)::bigint
  ) not valid;

alter table public.bookings validate constraint bookings_success_fee_exact_check;

create unique index if not exists bookings_proposal_unique_idx
  on public.bookings(proposal_id)
  where proposal_id is not null;

create or replace function public.reject_financial_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'financial_events are append-only' using errcode = '55000';
end;
$$;

drop trigger if exists financial_events_append_only on public.financial_events;
create trigger financial_events_append_only
before update or delete on public.financial_events
for each row execute function public.reject_financial_event_mutation();

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

  -- Retry-safe: once a proposal already produced a booking for this buyer,
  -- return the existing booking before checking mutable proposal/request state.
  select id into v_booking_id
  from public.bookings
  where proposal_id = p_proposal_id
    and buyer_id = v_user_id;

  if v_booking_id is not null then
    return v_booking_id;
  end if;

  if v_request.status not in ('open', 'matched') then
    raise exception 'request is not bookable' using errcode = '22023';
  end if;

  if v_proposal.status <> 'sent' then
    raise exception 'proposal is not available' using errcode = '22023';
  end if;

  select booking_enabled into v_booking_enabled
  from public.country_launches
  where country_code = v_request.country_code;

  if coalesce(v_booking_enabled, false) = false then
    raise exception 'bookings are not enabled in this country' using errcode = '55000';
  end if;

  v_fee := round(v_proposal.amount_minor::numeric * 0.10)::bigint;

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
    'accepted',
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
      'currency', v_proposal.currency
    )
  );

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'booking.created_from_proposal',
    'booking',
    v_booking_id::text,
    jsonb_build_object('proposal_id', v_proposal.id, 'request_id', v_request.id)
  );

  return v_booking_id;
end;
$$;

revoke all on function public.accept_proposal_and_create_booking(uuid) from public;
grant execute on function public.accept_proposal_and_create_booking(uuid) to authenticated;
