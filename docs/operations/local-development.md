# Local development
1. Use Node 22.12+.
2. `npm install`
3. Start Supabase locally with `npm run supabase:start` if testing database integration.
4. Copy `.env.example` to `.env.local` and populate local-only keys.
5. Never commit `.env.local`.
6. `npm run dev`
7. Before committing: `npm run validate`.
