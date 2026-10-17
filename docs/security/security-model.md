# Security model

## Trust boundary

- Front-end code receives only publishable/anonymous Supabase credentials.
- Service-role, payment and operational credentials remain server-only.
- Every Data API table uses explicit SQL grants plus RLS; RLS never substitutes for table privileges.
- Authorization never relies on user-editable metadata.
- Provider ownership and other private cross-table checks use caller-bound boolean helpers in the non-exposed `private` schema instead of granting clients private columns.
- `SECURITY DEFINER` functions use `search_path = ''`, validate `auth.uid()` where relevant and have explicit execute grants.
- Administrative actions are role-gated from server-controlled authorization data and are auditable.

## Authentication and sessions

- Password sign-in/sign-up is performed through server functions and Supabase Auth.
- Password-reset requests are enumeration-safe: the response does not reveal whether an address exists.
- Recovery completion requires a valid recovery session and updates the password through Supabase Auth.
- Normal sign-out is scoped to the current session; users can explicitly revoke all sessions from account controls.
- TanStack Start's default CSRF protection remains enabled because TrustBooker does not override `src/start.ts`.
- Production launch requires tested redirect allowlists, production SMTP and session/revocation checks on the deployed domain.

## Marketplace and financial controls

- Proposal acceptance is transaction-safe and retry-idempotent.
- The success fee is calculated in Postgres and constrained to exactly 10% of the booking subtotal.
- Payment-aware booking state prevents the application from presenting unpaid work as paid.
- Booking money, verification status, review publication and Trust Score inputs are not free-form client writes.
- Financial events are append-only and have no browser Data API write grant.
- Payments, payouts, refunds and chargebacks remain independently gated until provider integration and reconciliation are proven.

## Abuse controls

Database-backed authenticated limits currently protect accepted writes for:

- service requests: 20 per 10 minutes
- proposals: 50 per 10 minutes
- messages: 120 per 5 minutes
- reviews: 10 per hour
- reports: 20 per hour

These are account-level database guardrails, not a substitute for production edge/IP rate limiting, bot detection, CAPTCHA/risk controls or alerting.

## Privacy and deletion

- A signed-in user can request or cancel account deletion.
- Deletion requests are blocked while the user participates in an active booking.
- The request is audited and cannot directly erase transaction or financial evidence.
- Destructive account deletion/anonymisation remains an operations workflow until legal retention requirements are approved and implemented.

## Runtime hardening

- `/health` reports process liveness without checking dependencies.
- `/ready` fails closed when the Supabase dependency is unavailable.
- Server responses receive request IDs plus baseline `nosniff`, frame-deny, referrer, permissions and cross-origin opener headers.
- CSP/HSTS are intentionally a deployment-stage control because the final production host, TLS termination and external origins are not yet fixed.

## Verification

Required repository checks include strict TypeScript, linting, unit tests, production build, dependency audit, Playwright runtime smoke tests, clean Supabase rebuild, authenticated integration tests, database lint and CodeQL. Production environments still require Supabase security/performance advisors, load tests, monitoring, backup/restore drills and incident exercises.
