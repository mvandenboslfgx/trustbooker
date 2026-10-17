-- TrustBooker reference schema.
-- REVIEWED DESIGN FILE ONLY: convert this to a Supabase migration with the CLI once a TrustBooker project is linked.
-- Never execute unreviewed against production.

create extension if not exists pgcrypto;

create type public.account_role as enum ('buyer','provider','admin','moderator','support');
create type public.provider_status as enum ('draft','active','paused','suspended');
create type public.request_status as enum ('draft','open','matched','booked','closed','cancelled');
create type public.proposal_status as enum ('sent','accepted','declined','withdrawn','expired');
create type public.booking_status as enum ('awaiting_provider','accepted','payment_pending','booked','in_progress','completed','disputed','cancelled');
create type public.verification_status as enum ('unverified','pending','verified','failed','expired');
create type public.review_status as enum ('pending','published','hidden','removed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 100),
  locale text not null default 'en-GB',
  country_code text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.account_role not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.provider_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  slug text not null unique,
  display_name text not null,
  headline text not null,
  description text not null default '',
  country_code text not null,
  locality text not null,
  status public.provider_status not null default 'draft',
  identity_status public.verification_status not null default 'unverified',
  business_status public.verification_status not null default 'unverified',
  trust_score smallint not null default 0 check (trust_score between 0 and 100),
  rating numeric(2,1) check (rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  completed_jobs integer not null default 0 check (completed_jobs >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  category_slug text not null,
  title text not null,
  description text not null,
  starting_price_minor bigint check (starting_price_minor >= 0),
  currency text not null default 'EUR',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete restrict,
  category_slug text not null,
  title text not null,
  description text not null,
  country_code text not null,
  locality text not null,
  budget_min_minor bigint check (budget_min_minor >= 0),
  budget_max_minor bigint check (budget_max_minor >= budget_min_minor),
  status public.request_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  provider_id uuid not null references public.provider_profiles(id) on delete restrict,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null,
  message text not null default '',
  status public.proposal_status not null default 'sent',
  created_at timestamptz not null default now(),
  unique (request_id, provider_id)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete restrict,
  provider_id uuid not null references public.provider_profiles(id) on delete restrict,
  request_id uuid references public.service_requests(id) on delete set null,
  proposal_id uuid references public.proposals(id) on delete set null,
  status public.booking_status not null default 'awaiting_provider',
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  marketplace_fee_minor bigint not null check (marketplace_fee_minor >= 0),
  currency text not null,
  scope_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  buyer_id uuid not null references auth.users(id) on delete restrict,
  provider_id uuid not null references public.provider_profiles(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 5000),
  status public.review_status not null default 'pending',
  verified_booking boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  request_id uuid references public.service_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  check (booking_id is not null or request_id is not null)
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now()
);

create table public.country_launches (
  country_code text primary key,
  discovery_enabled boolean not null default false,
  requests_enabled boolean not null default false,
  booking_enabled boolean not null default false,
  payments_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  disputes_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index provider_profiles_location_idx on public.provider_profiles(country_code, locality) where status = 'active';
create index services_provider_idx on public.services(provider_id) where is_active;
create index requests_buyer_idx on public.service_requests(buyer_id, created_at desc);
create index proposals_request_idx on public.proposals(request_id, created_at desc);
create index bookings_buyer_idx on public.bookings(buyer_id, created_at desc);
create index bookings_provider_idx on public.bookings(provider_id, created_at desc);
create index booking_events_booking_idx on public.booking_events(booking_id, created_at);
create index reviews_provider_idx on public.reviews(provider_id, created_at desc) where status = 'published';
create index messages_conversation_idx on public.messages(conversation_id, created_at);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.services enable row level security;
alter table public.service_requests enable row level security;
alter table public.proposals enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.reviews enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.country_launches enable row level security;
alter table public.audit_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.provider_profiles, public.services, public.reviews, public.country_launches to anon;
grant select on public.profiles, public.provider_profiles, public.services, public.service_requests, public.proposals, public.bookings, public.booking_events, public.reviews, public.conversations, public.conversation_members, public.messages, public.country_launches to authenticated;
grant insert, update on public.profiles, public.service_requests, public.proposals, public.reviews, public.messages to authenticated;

create policy profiles_self_select on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_self_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy providers_public_read on public.provider_profiles for select to anon, authenticated using (status = 'active');
create policy providers_owner_read on public.provider_profiles for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy services_public_read on public.services for select to anon, authenticated using (is_active = true);
create policy services_owner_read on public.services for select to authenticated using (exists (select 1 from public.provider_profiles p where p.id = provider_id and p.owner_user_id = (select auth.uid())));
create policy requests_buyer_all on public.service_requests for all to authenticated using ((select auth.uid()) = buyer_id) with check ((select auth.uid()) = buyer_id);
create policy requests_provider_read on public.service_requests for select to authenticated using (status = 'open');
create policy proposals_provider_read on public.proposals for select to authenticated using (exists (select 1 from public.provider_profiles p where p.id = provider_id and p.owner_user_id = (select auth.uid())));
create policy proposals_provider_insert on public.proposals for insert to authenticated with check (exists (select 1 from public.provider_profiles p where p.id = provider_id and p.owner_user_id = (select auth.uid())));
create policy proposals_buyer_read on public.proposals for select to authenticated using (exists (select 1 from public.service_requests r where r.id = request_id and r.buyer_id = (select auth.uid())));
create policy bookings_participant_read on public.bookings for select to authenticated using (buyer_id = (select auth.uid()) or exists (select 1 from public.provider_profiles p where p.id = provider_id and p.owner_user_id = (select auth.uid())));
create policy booking_events_participant_read on public.booking_events for select to authenticated using (exists (select 1 from public.bookings b where b.id = booking_id and (b.buyer_id = (select auth.uid()) or exists (select 1 from public.provider_profiles p where p.id = b.provider_id and p.owner_user_id = (select auth.uid())))));
create policy reviews_public_read on public.reviews for select to anon, authenticated using (status = 'published');
create policy reviews_buyer_insert on public.reviews for insert to authenticated with check (buyer_id = (select auth.uid()));
create policy conversations_member_read on public.conversations for select to authenticated using (exists (select 1 from public.conversation_members m where m.conversation_id = id and m.user_id = (select auth.uid())));
create policy conversation_members_self_read on public.conversation_members for select to authenticated using (user_id = (select auth.uid()));
create policy messages_member_read on public.messages for select to authenticated using (exists (select 1 from public.conversation_members m where m.conversation_id = conversation_id and m.user_id = (select auth.uid())));
create policy messages_member_insert on public.messages for insert to authenticated with check (sender_user_id = (select auth.uid()) and exists (select 1 from public.conversation_members m where m.conversation_id = conversation_id and m.user_id = (select auth.uid())));
create policy country_launches_public_read on public.country_launches for select to anon, authenticated using (true);

-- user_roles and audit_events intentionally have no client policies.
-- Provider/service mutations, booking state changes, verification, admin and financial changes should be server-controlled commands.
