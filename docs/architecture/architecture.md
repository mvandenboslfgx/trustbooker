# TrustBooker architecture

## Product surfaces
- Public discovery: landing pages, category pages, provider profiles and SEO surfaces.
- Buyer workspace: requests, proposals, bookings, messages, reviews and disputes.
- Provider workspace: service catalogue, availability, proposals, bookings, reputation and payout status.
- Trust operations: verification, review moderation, reports, dispute evidence and audit history.
- Marketplace operations: country launch gates, taxonomy, ranking diagnostics and transaction monitoring.

## Boundary rules
1. UI components never hold service-role credentials.
2. Client writes are constrained by RLS and explicit Data API grants.
3. Sensitive mutations additionally pass through server-side commands with validation and idempotency.
4. Payment state is derived from provider/webhook evidence, never from client redirects alone.
5. Trust badges are derived from authoritative verification records, not profile fields.
6. Review verification is derived from booking eligibility and participant identity.
7. Ranking is organic by default and has no paid-spend signal.
8. Country launch state controls whether booking/payment actions are available.

## Scaling direction
The initial architecture favours a modular monolith on Postgres/Supabase. Domain boundaries are explicit so high-volume workloads (search, messaging, fraud scoring, payments or analytics) can later be extracted without rewriting the product model.
