# Security policy

Please do not publish credentials, database URLs, service-role keys, payment secrets or vulnerability details in a public issue.

For security-sensitive reports, contact `security@trustbooker.com` once the production domain mailbox is active. Until then, repository owners should use a private GitHub security advisory.

## Baseline
- `.env.local` is ignored and must remain untracked.
- Service-role and payment credentials are server-only.
- Production database changes require explicit RLS/grant review.
- Transactional features stay gated until their controls are tested.
