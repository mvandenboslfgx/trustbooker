# TrustBooker Horizontal Marketplace — Jobs, Services & Events

## Goal

One TrustBooker identity and navigation, with distinct data models and regulated product flows.

- **Services (Werkspot-style)**: buyer posts a scope, verified provider offers, marketplace booking and completion, review. Existing implementation and geographic gates are preserved.
- **Jobs (Jobbird-style)**: employers publish vacancies; candidates browse and apply with consent. Phase 1 supports private job drafts, with public discovery intentionally closed. Application workflow, CV uploads, retention and employer moderation are separate work.
- **Events (Eventbrite-style)**: organizers create events; visitors discover, register and later purchase tickets. Phase 1 supports *free event drafts only*, with discovery closed. Capacity locks, attendee cancellation, refund policies and secure ticket generation are separate work.

## Exact limits in phase 1

- `/discover` is the unified entry point.
- `/jobs`, `/events` only return real public listings after a matching explicit country gate is enabled.
- `/create` saves real private drafts for signed-in employers or organizers. Drafts are never auto-published.
- No applications, attendee registration or ticket sales are active.
- No country is opened or seeded automatically.
- Existing services payment and payout flags stay false, independently from `vertical_market_launches`.
- An explicit reviewed publishing permission workflow must be developed before opening markets.
- Generic 10% success-fee plans do not automatically apply to salaries or ticket prices; economics and compliance need their own vertical pricing model.

## Security and privacy decisions

- RLS on every new table with minimal column grants.
- Postings default to `draft`, with no client permission to write `status`.
- Public reads require both `published` and matching `vertical_market_launches.discovery_enabled`.
- The employer/organizer gets a private view of their own drafts.
- Event drafts cannot be paid, cannot create orders, do not generate tickets.
- Employer applicant personal information, CVs, ticket attendee information and recruiter access require dedicated storage rules, consent, retention and user-deletion flows.
- Never copy users, emails, reviews, CVs or event listings from competitor platforms without the rights and appropriate opt-in. Offer invited, user-authorized profile import and original listings.
- Add privacy and legal review for NL/EU hiring, anti-discrimination, GDPR, ticket consumer disclosures and local terms before going live.

## Go-to-market

1. Start with a small vetted cohort of professionals and employers in one NL region, and permission-based invitations from businesses already advertising services.
2. Present a no-lead-fee, no-paid-ranking alternative to tradespeople. Import *only their own information with consent*, not competitor account data.
3. Add employer and organizer invitation pages, category-specific localized SEO, structured JobPosting/Event schema **only for genuinely published and verified live content**.
4. Create acquisition loops based on partner referral links and shareable original listings.
5. Measure verified signups, completed profile activation, actual leads, hires and event registrations — not vanity counts.

## Shipping gate

Run `npm run validate`, full Supabase migration rebuild, E2E, CodeQL and Cloudflare build checks. After migration, audit RLS/grants and confirm every new country gate is closed. Don't claim vacancy applications, tickets or full competitor integrations are live.
