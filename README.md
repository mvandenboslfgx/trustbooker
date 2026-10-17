# TrustBooker

**Trust-first global services marketplace.**

TrustBooker is a horizontal marketplace for discovering, comparing, requesting and transacting with local service professionals. Core marketplace participation intentionally avoids subscriptions, lead fees and paid ranking. The primary platform revenue model is a **10% success commission** on eligible successful bookings.

## Current implementation

TrustBooker now has a reproducible application and database foundation rather than a front-end-only prototype.

Implemented in this repository:

- React 19 + TanStack Start / Router application
- Supabase SSR authentication and account bootstrap
- buyer, provider, admin and moderator roles
- RLS-protected marketplace data
- provider onboarding, service catalogue and verification workflow
- staff-only provider verification and suspension
- live marketplace search using launch gates and earned ranking
- public provider profiles with active services and published verified reviews
- service requests and provider proposals
- transaction-safe proposal acceptance
- server-calculated **10% success fee invariant**
- booking participant workspace
- buyer/provider booking lifecycle with buyer-confirmed completion
- booking-linked participant chat
- country-gated disputes and staff resolution workflow
- completed-booking review submission and staff publication
- server-side rating and Trust Score recalculation
- append-only financial event protection
- audit events for privileged and transaction-sensitive actions
- real Supabase CLI migrations and deterministic local seed
- strict TypeScript, ESLint, Vitest, production build and dependency audit in CI
- clean-database migration rebuild in CI
- CodeQL workflow

## Deliberate launch gates

The presence of code does **not** mean every country or financial feature is live.

`country_launches` independently controls discovery, requests, bookings, payments, payouts and disputes. The local seed opens **GB internal testing** for discovery/requests/bookings while keeping payments, payouts and disputes disabled.

Live payments and payouts remain closed until a real payment-provider account, webhook signing, settlement/reconciliation, refund/chargeback handling and operational/legal checks have passed. TrustBooker must never mark money as paid merely because a booking exists.

Provider verification currently supports a staff-controlled workflow, but a production launch still requires a real identity/business evidence process or KYC/KYB provider before verification can be relied on at scale.

## Stack

- React 19 + TanStack Start / Router
- TypeScript strict mode
- Tailwind CSS 4
- Supabase Postgres / Auth / SSR
- Zod validation
- Vitest + Playwright
- GitHub Actions CI + CodeQL

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
npx supabase db reset
npx supabase migration list --local
```

CI runs application validation and a clean Supabase database rebuild as separate required engineering checks.

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

## Security

See `docs/security/security-model.md` and the RLS/security documentation in `docs/`. Real secrets belong only in `.env.local` or the deployment secret store and must never be committed.

The repository is suitable for controlled internal testing after environment setup. A public production launch still requires payment/KYC integrations, production monitoring and alerting, backup/recovery verification, legal/privacy review and real security/load testing.
