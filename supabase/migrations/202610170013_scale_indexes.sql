-- Scale-oriented indexes for the first production architecture.
create extension if not exists pg_trgm;

create index if not exists provider_profiles_discovery_idx
  on public.provider_profiles (country_code, status, trust_score desc, review_count desc);
create index if not exists provider_profiles_display_name_trgm_idx
  on public.provider_profiles using gin (display_name gin_trgm_ops);
create index if not exists provider_profiles_headline_trgm_idx
  on public.provider_profiles using gin (headline gin_trgm_ops);
create index if not exists provider_profiles_locality_trgm_idx
  on public.provider_profiles using gin (locality gin_trgm_ops);
create index if not exists provider_profiles_owner_idx
  on public.provider_profiles (owner_user_id);

create index if not exists services_provider_active_idx
  on public.services (provider_id, is_active, starting_price_minor);
create index if not exists services_category_active_idx
  on public.services (category_slug, is_active);
create index if not exists services_title_trgm_idx
  on public.services using gin (title gin_trgm_ops);
create index if not exists services_description_trgm_idx
  on public.services using gin (description gin_trgm_ops);

create index if not exists service_requests_buyer_status_idx
  on public.service_requests (buyer_id, status, created_at desc);
create index if not exists service_requests_market_status_idx
  on public.service_requests (country_code, status, created_at desc);
create index if not exists service_requests_category_status_idx
  on public.service_requests (category_slug, status, created_at desc);

create index if not exists proposals_request_status_idx
  on public.proposals (request_id, status, created_at desc);
create index if not exists proposals_provider_status_idx
  on public.proposals (provider_id, status, created_at desc);

create index if not exists bookings_buyer_status_idx
  on public.bookings (buyer_id, status, updated_at desc);
create index if not exists bookings_provider_status_idx
  on public.bookings (provider_id, status, updated_at desc);
create index if not exists bookings_request_idx
  on public.bookings (request_id);

create index if not exists booking_events_booking_created_idx
  on public.booking_events (booking_id, created_at desc);
create index if not exists conversation_members_user_idx
  on public.conversation_members (user_id, conversation_id);
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

create index if not exists reviews_provider_published_idx
  on public.reviews (provider_id, status, created_at desc);
create index if not exists reviews_status_created_idx
  on public.reviews (status, created_at);
create index if not exists disputes_status_created_idx
  on public.disputes (status, created_at);
create index if not exists reports_status_created_idx
  on public.reports (status, created_at);
create index if not exists audit_events_entity_idx
  on public.audit_events (entity_type, entity_id, created_at desc);
create index if not exists audit_events_actor_idx
  on public.audit_events (actor_user_id, created_at desc);
create index if not exists financial_events_booking_idx
  on public.financial_events (booking_id, created_at desc);
