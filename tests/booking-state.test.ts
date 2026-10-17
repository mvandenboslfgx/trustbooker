import { describe, expect, it } from "vitest";
import { assertBookingTransition, canTransitionBooking } from "@domain/booking-state";

describe("booking state machine", () => {
  it("allows the accountable happy path", () => {
    expect(canTransitionBooking("draft", "awaiting_provider")).toBe(true);
    expect(canTransitionBooking("booked", "in_progress")).toBe(true);
    expect(canTransitionBooking("in_progress", "completion_pending")).toBe(true);
    expect(canTransitionBooking("completion_pending", "completed")).toBe(true);
  });

  it("does not let one side skip buyer confirmation", () => {
    expect(canTransitionBooking("in_progress", "completed")).toBe(false);
    expect(() => assertBookingTransition("draft", "completed")).toThrow();
    expect(canTransitionBooking("cancelled", "booked")).toBe(false);
  });
});
