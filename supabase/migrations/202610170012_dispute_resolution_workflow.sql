-- Staff-only dispute queue and resolution. Financial refunds remain outside this
-- workflow until a payment provider is enabled; this resolves marketplace state only.

create or replace function public.list_open_disputes()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null or not exists (
    select 1 from public.user_roles
    where user_id = v_user_id and role in ('admin', 'moderator')
  ) then
    raise exception 'staff role required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'booking_id', d.booking_id,
    'provider_id', b.provider_id,
    'provider_name', p.display_name,
    'buyer_id', b.buyer_id,
    'opened_by', d.opened_by,
    'status', d.status,
    'reason', d.reason,
    'booking_status', b.status,
    'subtotal_minor', b.subtotal_minor,
    'currency', b.currency,
    'created_at', d.created_at
  ) order by d.created_at asc), '[]'::jsonb)
  into v_result
  from public.disputes d
  join public.bookings b on b.id = d.booking_id
  join public.provider_profiles p on p.id = b.provider_id
  where d.status not in ('resolved', 'closed');

  return v_result;
end;
$$;

revoke all on function public.list_open_disputes() from public;
grant execute on function public.list_open_disputes() to authenticated;

create or replace function public.resolve_dispute(
  p_dispute_id uuid,
  p_outcome text,
  p_resolution_note text
)
returns public.booking_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_dispute public.disputes%rowtype;
  v_booking public.bookings%rowtype;
  v_new_status public.booking_status;
begin
  if v_user_id is null or not exists (
    select 1 from public.user_roles
    where user_id = v_user_id and role in ('admin', 'moderator')
  ) then
    raise exception 'staff role required' using errcode = '42501';
  end if;

  p_resolution_note := trim(p_resolution_note);
  if char_length(p_resolution_note) not between 10 and 5000 then
    raise exception 'resolution note must explain the decision' using errcode = '22023';
  end if;

  select * into v_dispute
  from public.disputes
  where id = p_dispute_id
  for update;

  if not found then
    raise exception 'dispute not found' using errcode = 'P0002';
  end if;

  if v_dispute.status in ('resolved', 'closed') then
    raise exception 'dispute already resolved' using errcode = '22023';
  end if;

  select * into v_booking
  from public.bookings
  where id = v_dispute.booking_id
  for update;

  if p_outcome = 'complete' then
    v_new_status := 'completed';
  elsif p_outcome = 'cancel' then
    v_new_status := 'cancelled';
  else
    raise exception 'invalid dispute outcome' using errcode = '22023';
  end if;

  update public.disputes
  set status = 'resolved',
      resolution_note = p_resolution_note,
      resolved_at = now()
  where id = p_dispute_id;

  update public.bookings
  set status = v_new_status
  where id = v_booking.id;

  insert into public.booking_events (booking_id, actor_user_id, event_type, payload)
  values (
    v_booking.id,
    v_user_id,
    'booking.dispute_resolved',
    jsonb_build_object(
      'dispute_id', p_dispute_id,
      'outcome', p_outcome,
      'from', v_booking.status,
      'to', v_new_status
    )
  );

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'dispute.resolved',
    'dispute',
    p_dispute_id::text,
    jsonb_build_object(
      'booking_id', v_booking.id,
      'outcome', p_outcome,
      'booking_status', v_new_status
    )
  );

  return v_new_status;
end;
$$;

revoke all on function public.resolve_dispute(uuid, text, text) from public;
grant execute on function public.resolve_dispute(uuid, text, text) to authenticated;
