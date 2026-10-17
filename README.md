# TrustBooker

**Trust-first global services marketplace.**

TrustBooker is a horizontal marketplace for discovering, comparing, requesting and transacting with local service professionals. Core marketplace participation intentionally avoids subscriptions, lead fees and paid ranking. The primary platform revenue model is a **10% success commission** on eligible successful bookings.

## Current implementation

TrustBooker has a reproducible application, database and security-testing foundation rather than a front-end-only prototype.

Implemented in this repository:

- React 19 + TanStack Start / Router application
- Supabase SSR authentication and automatic account bootstrap
- password signup/sign-in, enumeration-safe recovery and global session revocation controls
- buyer, provider, admin and moderator roles
- RLS-protected marketplace data with explicit Data API grants
- private caller-bound RLS helper functions so provider ownership fields remain non-public
- provider onboarding, service catalogue, verification and reverification workflow
- staff-only provider verification, review moderation, dispute resolution and suspension
- live marketplace search using country launch gates and earned ranking
- public provider profiles with active services and published verified reviews
- service requests and provider proposals
- retry-safe transaction proposal acceptance
- server-calculated **10% success-fee invariant**
- payment-aware booking state: `payment_pending` only when payments are actually enabled; otherwise internal testing starts at `booked`
- booking participant workspace and buyer/provider lifecycle with buyer-confirmed completion
- booking-linked participant chat
- country-gated disputes and staff resolution workflow
- completed-booking review submission and controlled publication
- server-side rating and Trust Score recalculation
- append-only financial event protection
- audit events for privileged and transaction-sensitive actions
- self-service account deletion request/cancellation with active-booking safety checks
- database-backed authenticated write limits for requests, proposals, messages, reviews and reports
- liveness (`/health`) and dependency readiness (`/ready`) probes
- global request IDs and baseline browser security response headers
- real Supabase CLI migrations and deterministic local seed
- strict TypeScript, ESLint, Vitest, production build and high-severity dependency audit in CI
- Playwright SSR/public-route/security smoke tests in CI
- clean-database migration rebuild, database lint and authenticated Supabase integration tests in CI
- CodeQL scanning and weekly Dependabot monitoring

## Deliberate launch gates

The presence of code does **not** mean every country or financial feature is live.

`country_launches` independently controls discovery, requests, bookings, payments, payouts and disputes. The local seed opens **GB internal testing** for discovery/requests/bookings while keeping payments, payouts and disputes disabled.

Live payments and payouts remain closed until a real payment-provider account, webhook signing, settlement/reconciliation, refund/chargeback handling and operational/legal checks have passed. TrustBooker must never mark money as paid merely because a booking exists.

Provider verification is staff-controlled, but a production launch still requires a real identity/business evidence process or KYC/KYB provider before verification can be relied on at scale.

Password recovery is implemented, but production email delivery requires approved SMTP/provider configuration. Account deletion requests are implemented, while destructive deletion/anonymisation remains an operations workflow until transaction-retention rules are approved.

## Stack

- React 19 + TanStack Start / Router
- TypeScript strict mode
- Tailwind CSS 4
- Supabase Postgres / Auth / SSR
- Zod validation
- Vitest + Playwright
- GitHub Actions CI + CodeQL + Dependabot

## Local development

```bash
npm ci
npx supabase start
npx supabase db reset
npm run dev
```

The local app defaults to `http://127.0.0.1:3000`. Use `npx supabase status -o env` to obtain local development values and place secrets only in `.env.local`.

## Validation

```bash
npm run validate
npm audit --audit-level=high
npm run test:e2e
npx supabase db reset
set -a && eval "$(npx supabase status -o env)" && set +a
npm run test:integration
npx supabase db lint --local --level warning
npx supabase migration list --local
```

CI separates application validation, browser E2E and a clean Supabase database/integration rebuild so a green UI build cannot hide a broken runtime or database policy.

## Product rules

- Free core marketplace participation
- No core subscription requirement
- No lead fees
- No pay-to-win ranking
- Primary revenue: **10% success commission**
- Country-level capability gates
- Financial state is server-controlled
- Verified reviews must be linked to eligible completed bookings
- Provider trust and verification fields are not client-controlled
- Browser clients cannot create or mutate financial evidence

## Security

See `SECURITY.md`, `docs/security/security-model.md`, `docs/security/rls-policy-matrix.md` and `docs/audits/release-gates.md`. Real secrets belong only in `.env.local` or the deployment secret store and must never be committed.

The repository is suitable for controlled internal testing after environment setup. A public production launch still requires a dedicated TrustBooker Supabase environment, production SMTP, payment/KYC integrations, production monitoring and alerting, backup/recovery verification, legal/privacy review, edge/bot abuse controls and real security/load testing.
