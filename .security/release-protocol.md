# Mandatory security release protocol

This baseline applies to existing and new changes, including historical code. A release is NO-GO until each applicable item has evidence and all high/critical risks are resolved and retested. The owner must approve production deployment. A passing automated scan is not proof of security.

| # | Required verification |
|---|---|
| 1 | Secret API keys server-side only; rotate exposed credentials; distinguish publishable keys. |
| 2 | Environment variables validated, least privilege, never logged or committed. |
| 3 | Server-side admin authorization on every protected route, MFA for privileged accounts. |
| 4 | Authentication and authorization; secure sessions, logout, expiry and recovery. |
| 5 | Ownership/tenant isolation; negative cross-tenant tests with distinct test accounts. |
| 6 | Server-side schema validation, size limits and safe handling of forms. |
| 7 | Contextual output encoding, CSP where applicable, XSS and CSRF tests. |
| 8 | Rate limits on authentication, public writes and expensive APIs; test safely in staging. |
| 9 | Explicit CORS allowlists; no credentialed wildcard origins. |
| 10 | Verify live security headers, HTTPS, cookie settings and cache behavior. |
| 11 | Disable production debug, stack traces and test-only endpoints. |
| 12 | Audit direct/transitive dependencies and lockfiles; remediate high/critical findings. |
| 13 | Remove unused code, packages and obsolete endpoints after regression testing. |
| 14 | Check deployed files, source maps, backups and artifacts for sensitive data exposure. |
| 15 | Database least privilege, RLS/tenant isolation where applicable, backups and recovery tests. |
| 16 | Managed auth or strong salted password hashing; no reversible or plaintext passwords. |
| 17 | Scan reachable Git history and working tree for secrets; rotate any exposed credentials. |
| 18 | Document full security audit, staging negative tests and owner approval before production. |

Run `bash .security/release-gate.sh` in a complete trusted clone with an independently verified Gitleaks installation. Review scanner exclusions and use the appropriate dependency audit for non-npm stacks and nested packages. Run existing project-specific security tests only against local/staging fixtures unless separately authorized. Never include secret values or customer records in logs, issues or PRs. Keep findings private. No automated deployment is introduced by this change.

Record the commit, environment, evidence, unresolved findings, remediation and retest results for every applicable check. Unknown/unverified is NO-GO. Require the resulting security checks through branch protection before considering enforcement complete. Do not bypass release gates due to deadlines.
