-- Align database state with the application state machine and make country gates
-- impossible to bypass through direct PostgREST access.
alter type public.booking_status add value if not exists 'draft' before 'awaiting_provider';

drop policy if exists providers_public_read on public.provider_profiles;
create policy providers_public_read on public.provider_profiles
  for select to anon, authenticated
  using (
    status = 'active'
    and exists (
      select 1 from public.country_launches launch
      where launch.country_code = provider_profiles.country_code
        and launch.discovery_enabled = true
    )
  );

drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services
  for select to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.provider_profiles p
      join public.country_launches launch on launch.country_code = p.country_code
      where p.id = services.provider_id
        and p.status = 'active'
        and launch.discovery_enabled = true
    )
  );

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select to anon, authenticated
  using (
    status = 'published'
    and verified_booking = true
    and exists (
      select 1
      from public.provider_profiles p
      join public.country_launches launch on launch.country_code = p.country_code
      where p.id = reviews.provider_id
        and p.status = 'active'
        and launch.discovery_enabled = true
    )
  );

drop policy if exists requests_buyer_insert on public.service_requests;
create policy requests_buyer_insert on public.service_requests
  for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and status in ('draft','open')
    and exists (
      select 1 from public.country_launches launch
      where launch.country_code = service_requests.country_code
        and launch.requests_enabled = true
    )
  );

drop policy if exists requests_buyer_update on public.service_requests;
create policy requests_buyer_update on public.service_requests
  for update to authenticated
  using (
    buyer_id = (select auth.uid())
    and status in ('draft','open')
  )
  with check (
    buyer_id = (select auth.uid())
    and status in ('draft','open')
    and exists (
      select 1 from public.country_launches launch
      where launch.country_code = service_requests.country_code
        and launch.requests_enabled = true
    )
  );

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
    and exists (
      select 1 from public.provider_profiles p
      where p.owner_user_id = (select auth.uid()) and p.status = 'active'
    )
  );

drop policy if exists proposals_provider_insert on public.proposals;
create policy proposals_provider_insert on public.proposals
  for insert to authenticated
  with check (
    status = 'sent'
    and exists (
      select 1 from public.provider_profiles p
      where p.id = proposals.provider_id
        and p.owner_user_id = (select auth.uid())
        and p.status = 'active'
    )
    and exists (
      select 1
      from public.service_requests r
      join public.country_launches launch on launch.country_code = r.country_code
      where r.id = proposals.request_id
        and r.status = 'open'
        and launch.requests_enabled = true
    )
  );
