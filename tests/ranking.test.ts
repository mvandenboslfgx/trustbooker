import { describe, expect, it } from "vitest";
import { calculateOrganicRank } from "@domain/ranking";

describe("organic marketplace ranking", () => {
  it("rewards relevance and trust without a paid-spend input", () => {
    const strong = calculateOrganicRank({ relevance:1, trustScore:96, rating:4.9, completedJobs:400, responseMinutes:15, distanceKm:4 });
    const weak = calculateOrganicRank({ relevance:.5, trustScore:60, rating:4, completedJobs:8, responseMinutes:300, distanceKm:40 });
    expect(strong).toBeGreaterThan(weak);
  });
});
