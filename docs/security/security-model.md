# Security model

## Baseline
- Front-end only receives publishable/anonymous Supabase credentials.
- Service-role and payment credentials remain server-only.
- Every table exposed through the Supabase Data API must use explicit grants and RLS.
- Authorization never relies on user-editable metadata.
- Sensitive state changes use server-side validation and idempotency keys.
- Views exposed to clients use `security_invoker = true` where supported.
- Administrative actions are role-gated from server-controlled authorization data and are auditable.

## Financial controls
Payments, payouts, refunds, chargebacks and disputes remain independently gated. Production activation requires documented funds-flow approval and end-to-end sandbox evidence.
