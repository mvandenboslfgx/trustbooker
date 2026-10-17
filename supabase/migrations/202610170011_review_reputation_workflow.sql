-- Verified review publication and deterministic provider reputation recalculation.

create or replace function public.recalculate_provider_reputation(p_provider_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider public.provider_profiles%rowtype;
  v_review_count integer;
  v_rating numeric;
  v_completed integer;
  v_disputes integer;
  v_dispute_rate numeric;
  v_score numeric;
begin
  select * into v_provider
  from public.provider_profiles
  where id = p_provider_id;

  if not found then return; end if;

  select count(*)::integer, coalesce(avg(rating), 0)
  into v_review_count, v_rating
  from public.reviews
  where provider_id = p_provider_id and status = 'published' and verified_booking = true;

  select count(*)::integer
  into v_completed
  from public.bookings
  where provider_id = p_provider_id and status = 'completed';

  select count(*)::integer
  into v_disputes
  from public.disputes d
  join public.bookings b on b.id = d.booking_id
  where b.provider_id = p_provider_id;

  v_dispute_rate := case
    when greatest(v_completed, 1) = 0 then 0
    else least(1::numeric, v_disputes::numeric / greatest(v_completed, 1)::numeric)
  end;

  v_score :=
    40
    + case when v_provider.identity_status = 'verified' then 12 else 0 end
    + case when v_provider.business_status = 'verified' then 8 else 0 end
    + (least(5::numeric, greatest(0::numeric, v_rating)) / 5) * 20
    + least(1::numeric, log(10::numeric, (v_review_count + 1)::numeric) / 2) * 10
    + least(1::numeric, log(10::numeric, (v_completed + 1)::numeric) / 2.5) * 10
    - least(1::numeric, greatest(0::numeric, v_dispute_rate)) * 18;

  update public.provider_profiles
  set rating = case when v_review_count = 0 then null else round(v_rating, 1) end,
      review_count = v_review_count,
      completed_jobs = v_completed,
      trust_score = round(least(100::numeric, greatest(0::numeric, v_score)))::smallint
  where id = p_provider_id;
end;
$$;

revoke all on function public.recalculate_provider_reputation(uuid) from public;

create or replace function public.reputation_after_booking_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    perform public.recalculate_provider_reputation(new.provider_id);
  end if;
  return new;
end;
$$;

revoke all on function public.reputation_after_booking_change() from public;

drop trigger if exists booking_reputation_after_update on public.bookings;
create trigger booking_reputation_after_update
after update of status on public.bookings
for each row execute function public.reputation_after_booking_change();

create or replace function public.reputation_after_provider_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.identity_status is distinct from new.identity_status
     or old.business_status is distinct from new.business_status then
    perform public.recalculate_provider_reputation(new.id);
  end if;
  return new;
end;
$$;

revoke all on function public.reputation_after_provider_verification() from public;

drop trigger if exists provider_verification_reputation_after_update on public.provider_profiles;
create trigger provider_verification_reputation_after_update
after update of identity_status, business_status on public.provider_profiles
for each row execute function public.reputation_after_provider_verification();

create or replace function public.list_pending_reviews()
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
    'id', r.id,
    'booking_id', r.booking_id,
    'provider_id', r.provider_id,
    'provider_name', p.display_name,
    'rating', r.rating,
    'body', r.body,
    'status', r.status,
    'created_at', r.created_at
  ) order by r.created_at asc), '[]'::jsonb)
  into v_result
  from public.reviews r
  join public.provider_profiles p on p.id = r.provider_id
  where r.status = 'pending';

  return v_result;
end;
$$;

revoke all on function public.list_pending_reviews() from public;
grant execute on function public.list_pending_reviews() to authenticated;

create or replace function public.moderate_review(p_review_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_review public.reviews%rowtype;
  v_booking public.bookings%rowtype;
begin
  if v_user_id is null or not exists (
    select 1 from public.user_roles
    where user_id = v_user_id and role in ('admin', 'moderator')
  ) then
    raise exception 'staff role required' using errcode = '42501';
  end if;

  select * into v_review from public.reviews where id = p_review_id for update;
  if not found then raise exception 'review not found' using errcode = 'P0002'; end if;

  select * into v_booking from public.bookings where id = v_review.booking_id;

  if p_decision = 'publish' then
    if v_booking.status <> 'completed'
       or v_booking.buyer_id <> v_review.buyer_id
       or v_booking.provider_id <> v_review.provider_id then
      raise exception 'review is not backed by an eligible completed booking' using errcode = '22023';
    end if;
    update public.reviews
    set status = 'published', verified_booking = true
    where id = p_review_id;
  elsif p_decision = 'hide' then
    update public.reviews set status = 'hidden', verified_booking = false where id = p_review_id;
  elsif p_decision = 'remove' then
    update public.reviews set status = 'removed', verified_booking = false where id = p_review_id;
  else
    raise exception 'invalid review decision' using errcode = '22023';
  end if;

  perform public.recalculate_provider_reputation(v_review.provider_id);

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'review.moderated',
    'review',
    p_review_id::text,
    jsonb_build_object('decision', p_decision, 'provider_id', v_review.provider_id)
  );
end;
$$;

revoke all on function public.moderate_review(uuid, text) from public;
grant execute on function public.moderate_review(uuid, text) to authenticated;
