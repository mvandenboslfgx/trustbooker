import { describe, expect, it } from "vitest";
import { calculateTrustScore } from "@domain/trust-score";
describe("trust score", () => {
  it("rewards verification and proven work", () => expect(calculateTrustScore({ identityVerified:true,businessVerified:true,rating:4.9,reviewCount:300,completedJobs:700,disputeRate:.01 })).toBeGreaterThan(90));
  it("penalises elevated dispute rates", () => { const clean=calculateTrustScore({identityVerified:true,businessVerified:true,rating:5,reviewCount:100,completedJobs:100,disputeRate:0}); const risky=calculateTrustScore({identityVerified:true,businessVerified:true,rating:5,reviewCount:100,completedJobs:100,disputeRate:.5}); expect(risky).toBeLessThan(clean); });
});
