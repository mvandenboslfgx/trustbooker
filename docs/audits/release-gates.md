# Production release gates

A release is not production-ready merely because the UI builds.

## Implemented and continuously validated
- Password signup and sign-in through Supabase Auth.
- Enumeration-safe password recovery request plus a dedicated recovery completion route.
- Self-service account deletion request/cancellation with an active-booking safety block and audit events.
- Explicit Data API grants and RLS on marketplace tables.
- Clean Supabase migration rebuild, database lint and authenticated marketplace integration tests in CI.
- Transaction-safe proposal acceptance with retry idempotency and an exact 10% server-calculated success fee.
- Browser E2E smoke coverage for critical public/auth routes.
- Dependency audit and CodeQL scanning in CI.

## Required before public transactions
- Configure and test production SMTP for signup and password recovery delivery; the Supabase trial mail service is not a production mail system.
- Test production auth redirect allowlists, session refresh/revocation and recovery links on the deployed domain.
- Implement the privileged deletion processor/anonymisation workflow and approve retention rules before treating a deletion request as destructive account erasure.
- Review Supabase security and performance advisors on the dedicated production TrustBooker project with no unexplained high-risk findings.
- Add production-grade rate limits, bot/abuse controls and alerting for auth, messaging, requests, reviews, reports and high-risk RPCs.
- Have Terms, privacy, cookie, data-retention and marketplace policies reviewed for target markets.
- Complete payment-provider marketplace/platform approval.
- Verify payment webhooks for signatures/authenticity, idempotency and replay safety.
- Test payout, refund, chargeback and dispute processes end-to-end.
- Reconcile the booking ledger against provider transactions.
- Document and test support/moderation escalation paths.
- Add production observability, error alerting, backup/restore verification and incident procedures.
- Pass E2E smoke coverage against the actual deployed production/staging environment, not only the local CI server.

## Valuation readiness is separate
A technically mature platform is not automatically a multi-million-euro business. Buyers will additionally expect evidence such as GMV, net revenue, repeat rate, take-rate durability, cohort retention, CAC efficiency, liquidity, fraud/loss rates and defensible marketplace density.
