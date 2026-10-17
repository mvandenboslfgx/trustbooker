-- TrustBooker multi-marketplace verticals: jobs and free events.
-- Closed by default. No payment, payout, ticket charging, scraping or imported accounts.

create table public.vertical_launches (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  jobs_enabled boolean not null default false,
  events_enabled boolean not null default false,
  free_event_registration_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint registration_requires_events check (not free_event_registration_enabled or events_enabled)
);
insert into public.vertical_launches (country_code) values ('GB'), ('NL');
alter table public.vertical_launches enable row level security;
revoke all on public.vertical_launches from public, anon, authenticated;
grant select on public.vertical_launches to anon, authenticated;
create policy vertical_flags_read on public.vertical_launches for select to anon, authenticated using (true);

create table public.job_listings (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
 title text not null check (char_length(title) between 5 and 180),
 company_name text not null check (char_length(company_name) between 2 and 120),
 description text not null check (char_length(description) between 30 and 10000),
 city text not null check (char_length(city) between 2 and 120),
 country_code text not null check (country_code ~ '^[A-Z]{2}$'),
 employment_type text not null default 'full_time' check (employment_type in ('full_time','part_time','contract','temporary','internship')),
 work_mode text not null default 'on_site' check (work_mode in ('on_site','hybrid','remote')),
 status text not null default 'draft' check (status in ('draft','pending','published','closed','rejected')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index jobs_visible_idx on public.job_listings(country_code, created_at desc) where status='published';
create index jobs_owner_idx on public.job_listings(owner_user_id, created_at desc);
alter table public.job_listings enable row level security;
revoke all on public.job_listings from public,anon,authenticated;
grant select on public.job_listings to anon,authenticated;
grant insert (title,company_name,description,city,country_code,employment_type,work_mode) on public.job_listings to authenticated;
grant update (title,company_name,description,city,country_code,employment_type,work_mode) on public.job_listings to authenticated;

create table public.job_applications (
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null references public.job_listings(id) on delete restrict,
 applicant_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
 cover_note text not null check (char_length(cover_note) between 20 and 5000),
 status text not null default 'submitted' check (status in ('submitted','withdrawn','reviewed')),
 created_at timestamptz not null default now(),
 unique (job_id, applicant_user_id)
);
create index job_application_owner_idx on public.job_applications(job_id,created_at desc);
alter table public.job_applications enable row level security;
revoke all on public.job_applications from public,anon,authenticated;
grant select on public.job_applications to authenticated;
grant insert (job_id,cover_note) on public.job_applications to authenticated;

create table public.event_listings (
 id uuid primary key default gen_random_uuid(),
 organizer_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
 title text not null check (char_length(title) between 5 and 180),
 organizer_name text not null check (char_length(organizer_name) between 2 and 120),
 description text not null check (char_length(description) between 30 and 10000),
 venue text not null check (char_length(venue) between 2 and 180),
 city text not null check (char_length(city) between 2 and 120),
 country_code text not null check (country_code ~ '^[A-Z]{2}$'),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 capacity integer not null check (capacity between 1 and 100000),
 price_minor integer not null default 0 check (price_minor=0),
 status text not null default 'draft' check (status in ('draft','pending','published','cancelled','rejected')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint event_end_after_start check (ends_at>starts_at)
);
create index events_visible_idx on public.event_listings(starts_at) where status='published';
create index events_owner_idx on public.event_listings(organizer_user_id,created_at desc);
alter table public.event_listings enable row level security;
revoke all on public.event_listings from public,anon,authenticated;
grant select on public.event_listings to anon,authenticated;
grant insert (title,organizer_name,description,venue,city,country_code,starts_at,ends_at,capacity) on public.event_listings to authenticated;
grant update (title,organizer_name,description,venue,city,country_code,starts_at,ends_at,capacity) on public.event_listings to authenticated;

create table public.event_registrations (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.event_listings(id) on delete restrict,
 attendee_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
 status text not null default 'registered' check (status in ('registered','cancelled')),
 created_at timestamptz not null default now(),
 unique(event_id,attendee_user_id)
);
create index event_registration_event_idx on public.event_registrations(event_id,status);
alter table public.event_registrations enable row level security;
revoke all on public.event_registrations from public,anon,authenticated;
grant select on public.event_registrations to authenticated;
-- Registration writes are deliberately RPC-only: capacity is checked with a lock.

create or replace function private.is_trustbooker_admin()
returns boolean language sql stable security definer set search_path=''
as $$ select auth.uid() is not null and exists (
  select 1 from public.user_roles where user_id=auth.uid() and role='admin'::public.account_role
); $$;
revoke all on function private.is_trustbooker_admin() from public,anon,authenticated;
grant execute on function private.is_trustbooker_admin() to authenticated;

create policy jobs_discovery_read on public.job_listings for select to anon,authenticated
using (status='published' and exists (
 select 1 from public.vertical_launches v where v.country_code=job_listings.country_code and v.jobs_enabled
));
create policy jobs_private_read on public.job_listings for select to authenticated
using (owner_user_id=(select auth.uid()) or private.is_trustbooker_admin());
create policy jobs_owner_insert on public.job_listings for insert to authenticated
with check (owner_user_id=(select auth.uid()) and status='draft');
create policy jobs_owner_update on public.job_listings for update to authenticated
using (owner_user_id=(select auth.uid()) and status='draft')
with check (owner_user_id=(select auth.uid()) and status='draft');

create policy applications_read on public.job_applications for select to authenticated
using (applicant_user_id=(select auth.uid()) or private.is_trustbooker_admin()
or exists (select 1 from public.job_listings j where j.id=job_id and j.owner_user_id=(select auth.uid())));
create policy applications_create on public.job_applications for insert to authenticated
with check (applicant_user_id=(select auth.uid()) and exists(
 select 1 from public.job_listings j join public.vertical_launches v on v.country_code=j.country_code
 where j.id=job_id and j.status='published' and v.jobs_enabled and j.owner_user_id<>(select auth.uid())
));

create policy events_discovery_read on public.event_listings for select to anon,authenticated
using (status='published' and starts_at>now() and exists (
 select 1 from public.vertical_launches v where v.country_code=event_listings.country_code and v.events_enabled
));
create policy events_private_read on public.event_listings for select to authenticated
using (organizer_user_id=(select auth.uid()) or private.is_trustbooker_admin());
create policy events_owner_insert on public.event_listings for insert to authenticated
with check (organizer_user_id=(select auth.uid()) and status='draft' and price_minor=0);
create policy events_owner_update on public.event_listings for update to authenticated
using (organizer_user_id=(select auth.uid()) and status='draft')
with check (organizer_user_id=(select auth.uid()) and status='draft' and price_minor=0);

create policy registrations_read on public.event_registrations for select to authenticated
using (attendee_user_id=(select auth.uid()) or private.is_trustbooker_admin() or exists (
 select 1 from public.event_listings e where e.id=event_id and e.organizer_user_id=(select auth.uid())
));

create or replace function public.submit_vertical_listing(p_kind text,p_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_changed integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_kind='job' then
   update public.job_listings set status='pending',updated_at=now()
   where id=p_id and owner_user_id=auth.uid() and status='draft';
 elsif p_kind='event' then
   update public.event_listings set status='pending',updated_at=now()
   where id=p_id and organizer_user_id=auth.uid() and status='draft' and starts_at>now();
 else raise exception 'Invalid listing kind' using errcode='22023';
 end if;
 get diagnostics v_changed=row_count;
 return v_changed=1;
end; $$;
revoke all on function public.submit_vertical_listing(text,uuid) from public,anon,authenticated;
grant execute on function public.submit_vertical_listing(text,uuid) to authenticated;

create or replace function public.moderate_vertical_listing(p_kind text,p_id uuid,p_decision text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_changed integer;
begin
 if not private.is_trustbooker_admin() then raise exception 'Admin only' using errcode='42501'; end if;
 if p_decision not in ('approve','reject') then raise exception 'Invalid decision' using errcode='22023'; end if;
 if p_kind='job' then
   update public.job_listings set status=case when p_decision='approve' then 'published' else 'rejected' end,updated_at=now()
   where id=p_id and status='pending';
 elsif p_kind='event' then
   update public.event_listings set status=case when p_decision='approve' then 'published' else 'rejected' end,updated_at=now()
   where id=p_id and status='pending' and starts_at>now();
 else raise exception 'Invalid kind' using errcode='22023';
 end if;
 get diagnostics v_changed=row_count;
 if v_changed=1 then
   insert into public.audit_events(actor_user_id,action,entity_type,entity_id,metadata)
   values(auth.uid(),'vertical.moderated',p_kind,p_id::text,jsonb_build_object('decision',p_decision));
 end if;
 return v_changed=1;
end; $$;
revoke all on function public.moderate_vertical_listing(text,uuid,text) from public,anon,authenticated;
grant execute on function public.moderate_vertical_listing(text,uuid,text) to authenticated;

create or replace function public.register_free_event(p_event_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_event public.event_listings%rowtype;v_id uuid;v_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into v_event from public.event_listings where id=p_event_id for update;
 if not found or v_event.status<>'published' or v_event.starts_at<=now()
 or not exists(select 1 from public.vertical_launches v where v.country_code=v_event.country_code and v.events_enabled and v.free_event_registration_enabled)
 then raise exception 'Registration is not available' using errcode='42501'; end if;
 if v_event.organizer_user_id=auth.uid() then raise exception 'Organizers cannot register for their own event' using errcode='22023'; end if;
 select id into v_id from public.event_registrations where event_id=p_event_id and attendee_user_id=auth.uid();
 select count(*) into v_count from public.event_registrations where event_id=p_event_id and status='registered';
 if v_id is not null and exists (select 1 from public.event_registrations where id=v_id and status='registered') then
   return v_id;
 end if;
 if v_count>=v_event.capacity then raise exception 'Event is full' using errcode='23514'; end if;
 if v_id is not null then
   update public.event_registrations set status='registered' where id=v_id;
   return v_id;
 end if;
 insert into public.event_registrations(event_id,attendee_user_id) values(p_event_id,auth.uid()) returning id into v_id;
 return v_id;
end; $$;
revoke all on function public.register_free_event(uuid) from public,anon,authenticated;
grant execute on function public.register_free_event(uuid) to authenticated;

create or replace function public.cancel_free_event_registration(p_event_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 update public.event_registrations set status='cancelled'
 where event_id=p_event_id and attendee_user_id=auth.uid() and status='registered';
 get diagnostics v_count=row_count;
 return v_count=1;
end; $$;
revoke all on function public.cancel_free_event_registration(uuid) from public,anon,authenticated;
grant execute on function public.cancel_free_event_registration(uuid) to authenticated;

comment on table public.job_listings is 'Free jobs marketplace. Publish only via staff moderation; public listing subject to country launch gate.';
comment on table public.event_listings is 'Free events only. No paid tickets, no payments. Country gated.';
comment on table public.vertical_launches is 'All country verticals disabled until explicitly enabled after operational approval.';
