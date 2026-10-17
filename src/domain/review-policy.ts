import type { Booking, Review } from "./models.js";

export function isBookingReviewEligible(booking: Booking): boolean {
  return booking.status === "completed";
}

export function canLabelVerifiedBooking(review: Review, booking: Booking): boolean {
  return (
    review.bookingId === booking.id &&
    review.buyerId === booking.buyerId &&
    review.providerId === booking.providerId &&
    isBookingReviewEligible(booking)
  );
}
