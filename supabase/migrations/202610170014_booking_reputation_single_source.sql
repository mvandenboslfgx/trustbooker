-- Keep booking state transitions independent from denormalized reputation writes.
-- Provider counters/scores are recomputed from transaction evidence by the
-- reputation trigger introduced in 202610170011.
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
