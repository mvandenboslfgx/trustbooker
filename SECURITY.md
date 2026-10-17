# Security policy

Please do not publish credentials, database URLs, service-role keys, payment secrets or vulnerability details in a public issue.

For security-sensitive reports, contact `security@trustbooker.com` once the production domain mailbox is active. Until then, repository owners should use a private GitHub security advisory.

## Baseline

- `.env.local` and other `.env*` files are ignored; only the secret-free `.env.example` is committed.
- Service-role and payment credentials are server-only.
- Production database changes require explicit SQL-grant/RLS review plus Supabase advisor checks.
- Authorization must not depend on user-editable metadata.
- `SECURITY DEFINER` functions require `search_path = ''`, caller validation where relevant and explicit execute grants.
- Transactional and financial features stay country-gated until their controls are tested.
- Browser clients cannot mark money as paid, publish reviews, grant staff roles or alter Trust Score/verification state.
- Default TanStack Start CSRF protection remains enabled; global response hardening is applied through the custom server entry.
- Dependency updates are monitored by Dependabot; CI runs dependency audit and CodeQL.

## Reporting

A useful private report should include the affected route/RPC/table, reproduction steps, expected impact and whether the issue requires an authenticated account. Do not include real customer data or live secrets in the report.

## Production-only controls still required

A green repository does not replace deployed-environment controls. Public launch still requires a dedicated TrustBooker Supabase project, production SMTP, edge/IP abuse protection, production observability and alerting, backup/restore verification, incident response procedures, legal/privacy review and real payment/KYC security validation.
