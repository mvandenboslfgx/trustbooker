-- Avoid leaking private provider ownership columns merely so RLS policies can
-- evaluate cross-table predicates. These helpers expose only booleans and use
-- auth.uid() internally; the private schema is not exposed through the Data API.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.provider_is_discoverable(p_provider_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.provider_profiles p
    join public.country_launches launch on launch.country_code = p.country_code
    where p.id = p_provider_id
      and p.status = 'active'
      and launch.discovery_enabled = true
  );
$$;

revoke all on function private.provider_is_discoverable(uuid) from public;
grant execute on function private.provider_is_discoverable(uuid) to anon, authenticated;

create or replace function private.current_user_owns_provider(
  p_provider_id uuid,
  p_require_active boolean
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null then false
    else exists (
      select 1
      from public.provider_profiles p
      where p.owner_user_id = auth.uid()
        and (p_provider_id is null or p.id = p_provider_id)
        and (not p_require_active or p.status = 'active')
    )
  end;
$$;

revoke all on function private.current_user_owns_provider(uuid, boolean) from public;
grant execute on function private.current_user_owns_provider(uuid, boolean) to authenticated;

-- Public service/review policies no longer need SELECT privileges on private
-- provider_profile columns.
drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services
  for select to anon, authenticated
  using (
    is_active = true
    and private.provider_is_discoverable(provider_id)
  );

drop policy if exists services_owner_read on public.services;
create policy services_owner_read on public.services
  for select to authenticated
  using (private.current_user_owns_provider(provider_id, false));

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select to anon, authenticated
  using (
    status = 'published'
    and verified_booking = true
    and private.provider_is_discoverable(provider_id)
  );

-- Provider-side request/proposal policies use the caller-bound helper rather
-- than requiring owner_user_id to be queryable from PostgREST.
drop policy if exists requests_provider_read on public.service_requests;
create policy requests_provider_read on public.service_requests
  for select to authenticated
  using (
    status = 'open'
    and exists (
      select 1 from public.country_launches launch
      where launch.country_code = service_requests.country_code
        and launch.requests_enabled = true
    )
    and private.current_user_owns_provider(null, true)
  );

drop policy if exists proposals_provider_read on public.proposals;
create policy proposals_provider_read on public.proposals
  for select to authenticated
  using (private.current_user_owns_provider(provider_id, false));

drop policy if exists proposals_provider_insert on public.proposals;
create policy proposals_provider_insert on public.proposals
  for insert to authenticated
  with check (
    status = 'sent'
    and private.current_user_owns_provider(provider_id, true)
    and exists (
      select 1
      from public.service_requests r
      join public.country_launches launch on launch.country_code = r.country_code
      where r.id = proposals.request_id
        and r.status = 'open'
        and launch.requests_enabled = true
    )
  );

-- Existing transaction access remains participant-only while suspended or
-- paused providers retain access to already-created bookings and evidence.
drop policy if exists bookings_participant_read on public.bookings;
create policy bookings_participant_read on public.bookings
  for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or private.current_user_owns_provider(provider_id, false)
  );

drop policy if exists booking_events_participant_read on public.booking_events;
create policy booking_events_participant_read on public.booking_events
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.buyer_id = (select auth.uid())
          or private.current_user_owns_provider(b.provider_id, false)
        )
    )
  );

drop policy if exists disputes_participant_read on public.disputes;
create policy disputes_participant_read on public.disputes
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.buyer_id = (select auth.uid())
          or private.current_user_owns_provider(b.provider_id, false)
        )
    )
  );
