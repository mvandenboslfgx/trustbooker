import { describe, expect, it } from "vitest";
import { assertBookingTransition, canTransitionBooking } from "@domain/booking-state";

describe("booking state machine", () => {
  it("allows the happy path", () => {
    expect(canTransitionBooking("draft", "awaiting_provider")).toBe(true);
    expect(canTransitionBooking("booked", "in_progress")).toBe(true);
    expect(canTransitionBooking("in_progress", "completed")).toBe(true);
  });

  it("rejects impossible jumps", () => {
    expect(() => assertBookingTransition("draft", "completed")).toThrow();
    expect(canTransitionBooking("cancelled", "booked")).toBe(false);
  });
});
