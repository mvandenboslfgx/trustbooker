# TrustBooker — Cloudflare Workers deployment

This deployment uses Cloudflare Workers + the Vite plugin and TanStack Start SSR.

## Review gate before deployment

- Only deploy the `mvandenboslfgx/trustbooker` repo, Worker name `trustbooker`.
- Test on the `workers.dev` origin before attaching the main domain.
- Use a dedicated Cloudflare deployment token instead of Tvelio credentials.
- Do not deploy until `npm ci`, `npm run validate`, and `npx wrangler deploy --dry-run` pass.
- Never commit secrets, environment secret values or credentials.
- The publicly readable TrustBooker Supabase URL is tracked under `wrangler.jsonc` `vars.SUPABASE_URL` to avoid losing it on GitHub deployment.
- `keep_vars: true` preserves dashboard-defined runtime text variables on Wrangler deploy. Without it, `npx wrangler deploy` replaces those variables and server functions can return `not_configured` after initially working.
- The `SUPABASE_ANON_KEY` binding is configured separately in the Cloudflare dashboard as a Secret, and must use the TrustBooker Supabase publishable key. Never use `service_role` or `sb_secret_` for this binding.
- Frontend `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_APP_URL` are build-time public settings and must be configured in Workers Builds. Build variables do not automatically become runtime bindings.
- Supabase Auth must explicitly allow the public origin and recovery redirect. Test signup/recovery before opening the main domain.
- Payments, payouts and country launch gates remain off until separate operational approval.

## Verification

1. `npm ci` and `npm run validate`.
2. `npx wrangler deploy --dry-run`.
3. Verify Cloudflare's build check passes for the latest main commit.
4. Recheck `/ready` **after every deploy**, not only after manually configuring environment variables.
5. Test `/login` new-account creation and email confirmation with a private test email.
6. Verify provider/buyer roles, RLS, and session continuity before connecting the main domain.

This document describes the setup; it is not proof that a full production launch or account registration succeeded.
