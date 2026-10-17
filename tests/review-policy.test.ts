import { describe, expect, it } from "vitest";
import { canLabelVerifiedBooking } from "@domain/review-policy";
import type { Booking, Review } from "@domain/models";

const booking: Booking = { id:"b1", buyerId:"u1", providerId:"p1", status:"completed", subtotalMinor:10000, marketplaceFeeMinor:1000, currency:"EUR" };
const review: Review = { id:"r1", bookingId:"b1", buyerId:"u1", providerId:"p1", rating:5, body:"Excellent", verifiedBooking:true, createdAt:"2026-01-01T00:00:00Z" };

describe("verified review policy", () => {
  it("requires an exact completed-booking relationship", () => expect(canLabelVerifiedBooking(review, booking)).toBe(true));
  it("rejects a mismatched buyer", () => expect(canLabelVerifiedBooking({ ...review, buyerId:"u2" }, booking)).toBe(false));
});
