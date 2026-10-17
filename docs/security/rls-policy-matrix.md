# RLS / Data API policy matrix

This document describes the intended client boundary enforced by the migration tree. It is validated against a clean local Supabase rebuild in CI; a dedicated production TrustBooker project still requires its own advisor review.

| Resource | Anonymous | Authenticated read | Client write | Server controlled |
| --- | --- | --- | --- | --- |
| Provider directory | Active rows in launched discovery markets, safe columns only | Same public directory plus owner workspace through controlled queries | None | Create/update/status/verification |
| Services | Active public services for discoverable providers | Public services; owner access via caller-bound helper | None | Create/update/activation |
| Service requests | None | Buyer owns; active providers can read open requests in enabled markets | Buyer may insert/edit content while draft/open | Status transitions/matching |
| Proposals | None | Buyer of request or owning provider | Active provider may submit one eligible proposal | Status transitions/acceptance |
| Bookings | None | Buyer/provider participant | None | Creation, status, money, scope snapshot |
| Booking events | None | Participants | None | Append-only transaction events |
| Reviews | Published verified reviews for discoverable providers | Same public reviews; buyer can see through transaction context | Buyer may submit against own completed booking only | Publication, moderation, verified flag |
| Messages | None | Conversation member | Member may insert body only; sender defaults to auth user | Membership/conversation creation |
| Disputes | None | Booking participants | None | Open/status/evidence/resolution |
| Reports | None | Reporter owns | Reporter may submit | Triage/action/dismissal |
| Account deletion requests | None | Request owner only | No direct table writes | Request/cancel/status via authenticated RPC and operations |
| Country gates | Read | Read | None | Launch controls |
| Roles / financial / webhooks / idempotency / audit | None | None | None | Server only |
| `private.rate_limit_buckets` | None | None | None | Private trigger/functions only |

## Private policy helpers

Cross-table policies must not force exposure of `provider_profiles.owner_user_id` or other internal fields. The `private` schema supplies narrowly scoped boolean functions such as provider ownership/discoverability checks. Browser roles receive execute only where required; the underlying private tables remain inaccessible.

## Critical invariants

1. `verified_booking` is never client writable.
2. A review insert is accepted only when booking, buyer and provider match and the booking is completed.
3. Booking, proposal and request state transitions are not free-form client updates.
4. Public provider access is column-limited; account linkage is not part of the public directory contract.
5. Financial and webhook records have no Data API client write grants.
6. Booking creation calculates the 10% fee server-side and retries return the existing booking for the same accepted proposal.
7. Country launch gates are enforced at database/RLS level, not only in the UI.
8. Account deletion requests cannot bypass active marketplace obligations.
9. Authenticated marketplace inserts are subject to database-backed rate limits.
10. RLS and SQL grants must both be reviewed after every migration.
11. Production migration must be followed by Supabase security/performance advisor review and negative-policy tests.
