import { z } from "zod";

const nonNegative = z.number().int().nonnegative();

export const adminOverviewSchema = z.object({
  captured_at: z.string(),
  totals: z.object({
    users: nonNegative,
    providers: nonNegative,
    active_providers: nonNegative,
    services: nonNegative,
    published_services: nonNegative,
    requests: nonNegative,
    proposals: nonNegative,
    bookings: nonNegative,
    completed_bookings: nonNegative,
    reviews: nonNegative,
    pending_provider_checks: nonNegative,
    pending_reviews: nonNegative,
    open_disputes: nonNegative,
    open_reports: nonNegative,
  }),
  countries: z.array(z.object({
    code: z.string().length(2),
    discovery: z.boolean(),
    requests: z.boolean(),
    bookings: z.boolean(),
    payments: z.boolean(),
    payouts: z.boolean(),
    disputes: z.boolean(),
    updated_at: z.string(),
  })).max(250),
  recent_providers: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    country: z.string(),
    locality: z.string(),
    status: z.string(),
    identity: z.string(),
    business: z.string(),
    services: nonNegative,
    created_at: z.string(),
  })).max(8),
  recent_services: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    category: z.string(),
    provider: z.string(),
    is_active: z.boolean(),
    created_at: z.string(),
  })).max(8),
  activity: z.array(z.object({
    id: nonNegative,
    action: z.string(),
    entity_type: z.string(),
    created_at: z.string(),
  })).max(12),
});

export type AdminOverview = z.infer<typeof adminOverviewSchema>;

export function isPublicMarket(country: AdminOverview["countries"][number]) {
  return country.discovery || country.requests || country.bookings;
}

export function isMoneyEnabled(country: AdminOverview["countries"][number]) {
  return country.payments || country.payouts;
}
