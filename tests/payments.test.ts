import { describe, expect, it } from "vitest";
import { assertPaymentTransition, canReleasePayout, canTransitionPayment } from "@domain/payments";

describe("payment state machine", () => {
  it("allows settlement and post-settlement refund paths", () => {
    expect(canTransitionPayment("pending", "paid")).toBe(true);
    expect(canTransitionPayment("paid", "refunded")).toBe(true);
  });

  it("rejects impossible resurrection of terminal failures", () => {
    expect(canTransitionPayment("failed", "paid")).toBe(false);
    expect(() => assertPaymentTransition("refunded", "paid")).toThrow();
  });

  it("releases payout only after every financial gate is true", () => {
    expect(canReleasePayout({ bookingStatus: "completed", paymentStatus: "paid", disputeOpen: false, fundsFlowApproved: true, payoutReleaseEnabled: true })).toBe(true);
    expect(canReleasePayout({ bookingStatus: "completed", paymentStatus: "paid", disputeOpen: true, fundsFlowApproved: true, payoutReleaseEnabled: true })).toBe(false);
    expect(canReleasePayout({ bookingStatus: "completed", paymentStatus: "paid", disputeOpen: false, fundsFlowApproved: false, payoutReleaseEnabled: true })).toBe(false);
  });
});
