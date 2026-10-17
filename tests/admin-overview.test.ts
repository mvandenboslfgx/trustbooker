import { describe, expect, it } from "vitest";
import { adminOverviewSchema, isMoneyEnabled, isPublicMarket } from "../src/lib/admin-overview";

const closedCountry = {
  code: "NL", discovery: false, requests: false, bookings: false,
  payments: false, payouts: false, disputes: false, updated_at: "2026-10-18T00:00:00Z",
};

describe("admin operations snapshot", () => {
  it("enforces genuinely closed markets in the UI", () => {
    expect(isMoneyEnabled(closedCountry)).toBe(false);
    expect(isPublicMarket(closedCountry)).toBe(false);
    expect(isMoneyEnabled({ ...closedCountry, payouts: true })).toBe(true);
    expect(isPublicMarket({ ...closedCountry, discovery: true })).toBe(true);
  });

  it("refuses incomplete, misleading counts", () => {
    expect(adminOverviewSchema.safeParse({ totals: { users: 0 } }).success).toBe(false);
  });

  it("never includes user email or financial metadata in a validated response", () => {
    const example = {
      captured_at: "2026-10-18T00:00:00Z",
      totals: {
        users: 2, providers: 1, active_providers: 0, services: 1,
        published_services: 0, requests: 0, proposals: 0, bookings: 0,
        completed_bookings: 0, reviews: 0, pending_provider_checks: 0,
        pending_reviews: 0, open_disputes: 0, open_reports: 0,
      },
      countries: [closedCountry],
      recent_providers: [],
      recent_services: [],
      activity: [],
      secret: "no",
    };
    const result = adminOverviewSchema.parse(example);
    expect(result).not.toHaveProperty("secret");
    expect(result.totals.users).toBe(2);
  });
});
