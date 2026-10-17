# RLS / Data API policy matrix

This document describes the intended client boundary for the reference schema. It is not evidence that a production database has been migrated.

| Resource | Anonymous | Authenticated read | Client write | Server controlled |
| --- | --- | --- | --- | --- |
| Provider directory | Active rows, safe columns only | Active rows, safe columns only | None | Create/update/status/verification |
| Services | Active public services | Active public services | None | Create/update/activation |
| Service requests | None | Buyer owns; active providers can read open requests | Buyer may insert/edit content while draft/open | Status transitions/matching |
| Proposals | None | Buyer of request or owning provider | Provider may submit one proposal | Status transitions |
| Bookings | None | Buyer/provider participant | None | Creation, status, money, scope snapshot |
| Booking events | None | Participants | None | Append-only events |
| Reviews | Published safe columns | Published safe columns | Buyer may submit only against own completed booking | Publication, moderation, verified flag |
| Messages | None | Conversation member | Member may insert body only; sender defaults to auth user | Membership/conversation creation |
| Disputes | None | Booking participants | None | Open/status/evidence/resolution |
| Reports | None | Reporter owns | Reporter may submit | Triage/action/dismissal |
| Country gates | Read | Read | None | Launch controls |
| Roles / financial / webhooks / idempotency / audit | None | None | None | Server only |

## Critical invariants

1. `verified_booking` is never client writable.
2. A review insert is accepted only when booking, buyer and provider match and the booking is completed.
3. Booking, proposal and request state transitions are not free-form client updates.
4. Public provider access is column-limited; account linkage is not part of the public directory contract.
5. Financial and webhook records have no Data API client grants.
6. RLS and SQL grants must both be reviewed after every migration.
7. Production migration must be followed by Supabase security/performance advisor review and negative-policy tests.
