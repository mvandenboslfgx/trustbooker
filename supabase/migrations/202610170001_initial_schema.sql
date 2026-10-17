-- TrustBooker reference schema v2.
-- DESIGN FILE ONLY: convert to reviewed Supabase CLI migrations once a dedicated
-- TrustBooker project is linked. Never execute this file unreviewed in production.

create extension if not exists pgcrypto;

create type public.account_role as enum ('buyer','provider','admin','moderator','support');
create type public.provider_status as enum ('draft','active','paused','suspended');
create type public.request_status as enum ('draft','open','matched','booked','closed','cancelled');
create type public.proposal_status as enum ('sent','accepted','declined','withdrawn','expired');
create type public.booking_status as enum ('awaiting_provider','accepted','payment_pending','booked','in_progress','completed','disputed','cancelled');
create type public.verification_status as enum ('unverified','pending','verified','failed','expired');
create type public.review_status as enum ('pending','published','hidden','removed');
create type public.dispute_status as enum ('open','evidence','review','resolved','closed');
create type public.report_status as enum ('open','triaged','actioned','dismissed');

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
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null check (char_length(display_name) between 2 and 120),
  headline text not null check (char_length(headline) between 5 and 180),
  description text not null default '' check (char_length(description) <= 10000),
  country_code text not null check (char_length(country_code) = 2),
  locality text not null,
  status public.provider_status not null default 'draft',
  identity_status public.verification_status not null default 'unverified',
  business_status public.verification_status not null default 'unverified',
  trust_score smallint not null default 0 check (trust_score between 0 and 100),
  rating numeric(2,1) check (rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  completed_jobs integer not null default 0 check (completed_jobs >= 0),
  response_minutes integer check (response_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  category_slug text not null,
  title text not null check (char_length(title) between 3 and 160),
  description text not null check (char_length(description) between 10 and 10000),
  starting_price_minor bigint check (starting_price_minor >= 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  category_slug text not null,
  title text not null check (char_length(title) between 5 and 180),
  description text not null check (char_length(description) between 20 and 10000),
  country_code text not null check (char_length(country_code) = 2),
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
  currency text not null check (char_length(currency) = 3),
  message text not null default '' check (char_length(message) <= 10000),
  status public.proposal_status not null default 'sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
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
  currency text not null check (char_length(currency) = 3),
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
  buyer_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
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
  sender_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now()
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  opened_by uuid not null references auth.users(id) on delete restrict,
  status public.dispute_status not null default 'open',
  reason text not null check (char_length(reason) between 10 and 5000),
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  target_type text not null check (target_type in ('provider','review','message','user')),
  target_id text not null,
  reason text not null check (char_length(reason) between 10 and 5000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.country_launches (
  country_code text primary key check (char_length(country_code) = 2),
  discovery_enabled boolean not null default false,
  requests_enabled boolean not null default false,
  booking_enabled boolean not null default false,
  payments_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  disputes_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Append-only operational/financial evidence. No client grants or policies.
create table public.financial_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete restrict,
  provider_event_id text,
  event_type text not null,
  amount_minor bigint,
  currency text check (currency is null or char_length(currency) = 3),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider_event_id)
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payload_hash text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique (provider, provider_event_id)
);

create table public.idempotency_keys (
  scope text not null,
  idempotency_key text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  request_hash text not null,
  result_ref text,
  created_at timestamptz not null default now(),
  primary key (scope, idempotency_key)
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
create index requests_open_location_idx on public.service_requests(country_code, locality, created_at desc) where status = 'open';
create index proposals_request_idx on public.proposals(request_id, created_at desc);
create index bookings_buyer_idx on public.bookings(buyer_id, created_at desc);
create index bookings_provider_idx on public.bookings(provider_id, created_at desc);
create index booking_events_booking_idx on public.booking_events(booking_id, created_at);
create index reviews_provider_idx on public.reviews(provider_id, created_at desc) where status = 'published';
create index messages_conversation_idx on public.messages(conversation_id, created_at);
create index disputes_booking_idx on public.disputes(booking_id);
create index reports_status_idx on public.reports(status, created_at);
create index financial_events_booking_idx on public.financial_events(booking_id, created_at);
create index audit_entity_idx on public.audit_events(entity_type, entity_id, created_at);

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
alter table public.disputes enable row level security;
alter table public.reports enable row level security;
alter table public.country_launches enable row level security;
alter table public.financial_events enable row level security;
alter table public.webhook_events enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.audit_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;

-- Public directory access is column-limited so account linkage and internal fields are not exposed.
grant select (id, slug, display_name, headline, description, country_code, locality, identity_status, business_status, trust_score, rating, review_count, completed_jobs, response_minutes, created_at, updated_at)
  on public.provider_profiles to anon, authenticated;
grant select (id, provider_id, category_slug, title, description, starting_price_minor, currency, created_at, updated_at)
  on public.services to anon, authenticated;
grant select (id, booking_id, provider_id, rating, body, verified_booking, created_at, updated_at)
  on public.reviews to anon, authenticated;
grant select on public.country_launches to anon, authenticated;

-- Authenticated private reads. RLS still decides which rows are visible.
grant select on public.profiles, public.service_requests, public.proposals, public.bookings, public.booking_events, public.conversations, public.conversation_members, public.messages, public.disputes, public.reports to authenticated;

-- Client writes are column-minimal. Status, verification and money state stay server-controlled.
grant update (display_name, locale, country_code, avatar_path) on public.profiles to authenticated;
grant insert (category_slug, title, description, country_code, locality, budget_min_minor, budget_max_minor) on public.service_requests to authenticated;
grant update (category_slug, title, description, country_code, locality, budget_min_minor, budget_max_minor) on public.service_requests to authenticated;
grant insert (request_id, provider_id, amount_minor, currency, message) on public.proposals to authenticated;
grant insert (booking_id, provider_id, rating, body) on public.reviews to authenticated;
grant insert (conversation_id, body) on public.messages to authenticated;
grant insert (target_type, target_id, reason) on public.reports to authenticated;

create policy profiles_self_select on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_self_update on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy providers_public_read on public.provider_profiles
  for select to anon, authenticated
  using (status = 'active');

create policy services_public_read on public.services
  for select to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1 from public.provider_profiles p
      where p.id = provider_id and p.status = 'active'
    )
  );

create policy requests_buyer_read on public.service_requests
  for select to authenticated
  using ((select auth.uid()) = buyer_id);

create policy requests_provider_read on public.service_requests
  for select to authenticated
  using (
    status = 'open'
    and exists (
      select 1 from public.provider_profiles p
      where p.owner_user_id = (select auth.uid()) and p.status = 'active'
    )
  );

create policy requests_buyer_insert on public.service_requests
  for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and status in ('draft','open')
  );

create policy requests_buyer_update on public.service_requests
  for update to authenticated
  using (
    buyer_id = (select auth.uid())
    and status in ('draft','open')
  )
  with check (
    buyer_id = (select auth.uid())
    and status in ('draft','open')
  );

create policy proposals_provider_read on public.proposals
  for select to authenticated
  using (
    exists (
      select 1 from public.provider_profiles p
      where p.id = provider_id and p.owner_user_id = (select auth.uid())
    )
  );

create policy proposals_provider_insert on public.proposals
  for insert to authenticated
  with check (
    status = 'sent'
    and exists (
      select 1 from public.provider_profiles p
      where p.id = provider_id and p.owner_user_id = (select auth.uid()) and p.status = 'active'
    )
    and exists (
      select 1 from public.service_requests r
      where r.id = request_id and r.status = 'open'
    )
  );

create policy proposals_buyer_read on public.proposals
  for select to authenticated
  using (
    exists (
      select 1 from public.service_requests r
      where r.id = request_id and r.buyer_id = (select auth.uid())
    )
  );

create policy bookings_participant_read on public.bookings
  for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or exists (
      select 1 from public.provider_profiles p
      where p.id = provider_id and p.owner_user_id = (select auth.uid())
    )
  );

create policy booking_events_participant_read on public.booking_events
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.buyer_id = (select auth.uid())
          or exists (
            select 1 from public.provider_profiles p
            where p.id = b.provider_id and p.owner_user_id = (select auth.uid())
          )
        )
    )
  );

create policy reviews_public_read on public.reviews
  for select to anon, authenticated
  using (status = 'published');

create policy reviews_buyer_insert on public.reviews
  for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and status = 'pending'
    and verified_booking = false
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.buyer_id = (select auth.uid())
        and b.provider_id = provider_id
        and b.status = 'completed'
    )
  );

create policy conversations_member_read on public.conversations
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_members m
      where m.conversation_id = id and m.user_id = (select auth.uid())
    )
  );

create policy conversation_members_self_read on public.conversation_members
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy messages_member_read on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_members m
      where m.conversation_id = conversation_id and m.user_id = (select auth.uid())
    )
  );

create policy messages_member_insert on public.messages
  for insert to authenticated
  with check (
    sender_user_id = (select auth.uid())
    and exists (
      select 1 from public.conversation_members m
      where m.conversation_id = conversation_id and m.user_id = (select auth.uid())
    )
  );

create policy disputes_participant_read on public.disputes
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.buyer_id = (select auth.uid())
          or exists (
            select 1 from public.provider_profiles p
            where p.id = b.provider_id and p.owner_user_id = (select auth.uid())
          )
        )
    )
  );

create policy reports_reporter_read on public.reports
  for select to authenticated
  using (reporter_user_id = (select auth.uid()));

create policy reports_reporter_insert on public.reports
  for insert to authenticated
  with check (
    reporter_user_id = (select auth.uid())
    and status = 'open'
  );

create policy country_launches_public_read on public.country_launches
  for select to anon, authenticated
  using (true);

-- No client policies/grants by design:
-- user_roles, financial_events, webhook_events, idempotency_keys, audit_events.
-- Provider/service mutations, booking state changes, proposal state changes, review
-- publication/verification, dispute mutations, moderation and all financial changes
-- must be implemented as validated server-side commands with audit/idempotency controls.
