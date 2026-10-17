import type { BookingStatus } from "./models.js";

const transitions: Record<BookingStatus, readonly BookingStatus[]> = {
  draft: ["awaiting_provider", "cancelled"],
  awaiting_provider: ["accepted", "cancelled"],
  accepted: ["payment_pending", "booked", "cancelled"],
  payment_pending: ["booked", "cancelled"],
  booked: ["in_progress", "cancelled", "disputed"],
  in_progress: ["completed", "disputed", "cancelled"],
  completed: ["disputed"],
  disputed: ["completed", "cancelled"],
  cancelled: [],
};

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  return transitions[from].includes(to);
}

export function assertBookingTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransitionBooking(from, to)) {
    throw new Error(`Invalid booking transition: ${from} -> ${to}`);
  }
}
