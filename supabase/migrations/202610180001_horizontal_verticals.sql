-- Additional marketplace verticals: employment and live events.
-- New verticals remain closed until separately approved per country.
-- No paid admission, ticket purchasing, paid ranking, payments or payouts here.

create table public.vertical_market_launches (
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  vertical text not null check (vertical in ('jobs','events')),
  discovery_enabled boolean not null default false,
  interactions_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (country_code,vertical)
);

create table public.job_posts (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 5 and 180),
  description text not null check (char_length(btrim(description)) between 30 and 10000),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  locality text not null check (char_length(btrim(locality)) between 2 and 160),
  employment_type text not null check (employment_type in ('full_time','part_time','contract','internship','temporary')),
  work_mode text not null check (work_mode in ('on_site','hybrid','remote')),
  salary_min_minor bigint check (salary_min_minor >= 0),
  salary_max_minor bigint check (salary_max_minor >= salary_min_minor),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft' check (status in ('draft','published','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index job_posts_discovery_idx on public.job_posts(country_code,created_at desc) where status='published';
create index job_posts_owner_idx on public.job_posts(employer_user_id,created_at desc);

create table public.event_posts (
  id uuid primary key default gen_random_uuid(),
  organizer_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 5 and 180),
  description text not null check (char_length(btrim(description)) between 30 and 10000),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  locality text not null check (char_length(btrim(locality)) between 2 and 160),
  venue_name text check (venue_name is null or char_length(btrim(venue_name)) between 2 and 160),
  is_online boolean not null default false,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  capacity integer check (capacity between 1 and 100000),
  admission_type text not null default 'free' check (admission_type='free'),
  status text not null default 'draft' check (status in ('draft','published','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_online or venue_name is not null)
);
create index event_posts_discovery_idx on public.event_posts(country_code,starts_at) where status='published';
create index event_posts_organizer_idx on public.event_posts(organizer_user_id,created_at desc);

alter table public.vertical_market_launches enable row level security;
alter table public.job_posts enable row level security;
alter table public.event_posts enable row level security;

revoke all on public.vertical_market_launches,public.job_posts,public.event_posts from public,anon,authenticated;
grant select on public.vertical_market_launches to anon,authenticated;
grant select (id,title,description,country_code,locality,employment_type,work_mode,salary_min_minor,salary_max_minor,currency,status,created_at) on public.job_posts to anon,authenticated;
grant select (id,title,description,country_code,locality,venue_name,is_online,starts_at,ends_at,capacity,admission_type,status,created_at) on public.event_posts to anon,authenticated;
grant insert (title,description,country_code,locality,employment_type,work_mode,salary_min_minor,salary_max_minor,currency) on public.job_posts to authenticated;
grant insert (title,description,country_code,locality,venue_name,is_online,starts_at,ends_at,capacity) on public.event_posts to authenticated;

create policy vertical_market_flags_read on public.vertical_market_launches
 for select to anon, authenticated using (true);

create policy job_posts_owner_select on public.job_posts for select to authenticated
 using (employer_user_id=(select auth.uid()));
create policy job_posts_public_select on public.job_posts for select to anon,authenticated
 using (status='published' and exists (
  select 1 from public.vertical_market_launches l
  where l.country_code=job_posts.country_code and l.vertical='jobs' and l.discovery_enabled
 ));
create policy job_posts_draft_create on public.job_posts for insert to authenticated
 with check (employer_user_id=(select auth.uid()) and status='draft');

create policy event_posts_owner_select on public.event_posts for select to authenticated
 using (organizer_user_id=(select auth.uid()));
create policy event_posts_public_select on public.event_posts for select to anon,authenticated
 using (status='published' and starts_at>now() and exists (
  select 1 from public.vertical_market_launches l
  where l.country_code=event_posts.country_code and l.vertical='events' and l.discovery_enabled
 ));
create policy event_posts_draft_create on public.event_posts for insert to authenticated
 with check (organizer_user_id=(select auth.uid()) and status='draft' and admission_type='free');

comment on table public.vertical_market_launches is 'Two independent launch gates for Jobs and Events. No country starts enabled.';
comment on table public.job_posts is 'Employer-owned draft jobs. Publishing requires future reviewed moderation and country activation.';
comment on table public.event_posts is 'Free admission draft events only. Ticketing and paid events are not enabled.';
