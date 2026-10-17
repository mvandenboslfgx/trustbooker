# Production release gates

A release is not production-ready merely because the UI builds.

## Required before public transactions
- Auth flows tested for signup, login, recovery, session refresh and account deletion.
- All exposed tables reviewed for explicit grants and RLS.
- Security and performance advisors reviewed with no unexplained high-risk findings.
- Rate limits and abuse controls in place for signup, messaging, requests, reviews and reports.
- Terms, privacy, cookie and marketplace policies reviewed for target markets.
- Payment provider marketplace/platform approval completed.
- Webhooks verified for signatures/authenticity, idempotency and replay safety.
- Payout, refund, chargeback and dispute processes tested end-to-end.
- Booking ledger reconciles against provider transactions.
- Support and moderation escalation paths documented.
- Observability, error alerting, backups and recovery procedures tested.
- E2E smoke coverage passes against the deployed environment.

## Valuation readiness is separate
A technically mature platform is not automatically a multi-million-euro business. Buyers will additionally expect evidence such as GMV, net revenue, repeat rate, take-rate durability, cohort retention, CAC efficiency, liquidity, fraud/loss rates and defensible marketplace density.
