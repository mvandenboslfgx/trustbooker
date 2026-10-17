# Database design package

These SQL files are **reviewed reference design**, not proof of a deployed production database.

Intended migration order once a dedicated TrustBooker Supabase project is linked:

1. `schema.sql` — types, tables, indexes, explicit grants and baseline RLS.
2. `commands.sql` — authenticated transactional commands such as provider bootstrap.
3. `queries.sql` — narrowly scoped private query RPCs that avoid exposing internal linkage columns.
4. Seed country launch gates explicitly; all transactional capabilities start disabled.
5. Run negative RLS tests, Supabase security advisors and performance advisors before enabling a country.

Never apply these files to an unrelated Supabase project. Production migrations must be captured under `supabase/migrations/` through the Supabase CLI after project ownership and environment are confirmed.
