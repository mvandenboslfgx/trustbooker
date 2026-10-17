# TrustBooker — Cloudflare Workers deployment

This deployment uses Cloudflare Workers + the Vite plugin and TanStack Start SSR.

## Review gate before deployment

- Only deploy the `mvandenboslfgx/trustbooker` repo, Worker name `trustbooker`.
- The initial deployment must use a test workers.dev address, not the production domain.
- Do not share or reuse the Tvelio deployment token. Use a dedicated token with permissions scoped to the relevant Cloudflare account.
- Do not deploy until `npm ci`, `npm run validate`, and `npx wrangler deploy --dry-run` pass.
- Never put secret values in `wrangler.jsonc`, GitHub source, logs or screenshots.
- The Cloudflare app must have valid server-side `SUPABASE_URL` and `SUPABASE_ANON_KEY` bindings. Frontend `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are public client credentials and must be present for browser builds. The service-role key must never be shipped to the browser.
- Supabase Auth must explicitly allow the eventual public origin and recovery redirect. Test signup and recovery before opening the domain.
- Payments/payouts and country launch gates stay disabled until separate operational approval.
- Cloudflare dashboard Git builds: build `npm run build`, deploy `npx wrangler deploy`, root `/`, preview builds disabled during initial setup.

## Verification

1. `npm ci`
2. `npm run validate`
3. `npx wrangler deploy --dry-run`
4. Staging deployment and `/health` test.
5. `/ready` dependency check against the dedicated TrustBooker Supabase.
6. Browser/account journey tests (including RLS isolation, booking and recovery).
7. Only after checks pass, attach `trustbooker.com` and configure `www` redirection.

This file is operational guidance, not evidence that deployment has been completed.
