# TrustBooker

**Trust-first global services marketplace.**

TrustBooker is designed as a horizontal marketplace for discovering, comparing, requesting and eventually transacting with local service professionals. The product model intentionally avoids subscriptions, lead fees and paid ranking for core marketplace participation. Its primary planned revenue model is a **10% success commission** on eligible successful bookings.

## Current implementation

This repository contains a premium front-end, domain foundation, trust-score and fee logic, SEO endpoints, test coverage, CI, Supabase client wiring and security/product documentation. Live authentication, production database writes, payments, payouts and disputes remain deliberately gated until the production Supabase and payments environments are connected and verified.

## Stack
- React 19 + TanStack Start / Router
- TypeScript strict mode
- Tailwind CSS 4
- Supabase client/SSR packages
- Zod validation
- Vitest + Playwright
- GitHub Actions CI

## Commands
```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run validate
```

## Product rules
- Free core marketplace actions
- No subscriptions for core participation
- No lead fees
- No pay-to-win ranking
- Planned primary revenue: **10% success commission**
- Country-level launch gates
- Payments, payouts and disputes off until individually approved

## Security
See `docs/security/security-model.md`. Real secrets belong only in `.env.local` or the deployment secret store and must never be committed.
