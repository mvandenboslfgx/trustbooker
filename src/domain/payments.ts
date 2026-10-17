import type { BookingStatus } from "./models.js";

export type PaymentStatus =
  | "created"
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "cancelled"
  | "partially_refunded"
  | "refunded"
  | "chargeback";

const paymentTransitions: Record<PaymentStatus, readonly PaymentStatus[]> = {
  created: ["pending", "authorized", "paid", "failed", "cancelled"],
  pending: ["authorized", "paid", "failed", "cancelled"],
  authorized: ["paid", "failed", "cancelled"],
  paid: ["partially_refunded", "refunded", "chargeback"],
  failed: [],
  cancelled: [],
  partially_refunded: ["partially_refunded", "refunded", "chargeback"],
  refunded: ["chargeback"],
  chargeback: [],
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return paymentTransitions[from].includes(to);
}

export function assertPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransitionPayment(from, to)) {
    throw new Error(`Invalid payment transition: ${from} -> ${to}`);
  }
}

export type PayoutReleaseSignals = {
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  disputeOpen: boolean;
  fundsFlowApproved: boolean;
  payoutReleaseEnabled: boolean;
};

export function canReleasePayout(signals: PayoutReleaseSignals): boolean {
  return (
    signals.bookingStatus === "completed" &&
    signals.paymentStatus === "paid" &&
    !signals.disputeOpen &&
    signals.fundsFlowApproved &&
    signals.payoutReleaseEnabled
  );
}
