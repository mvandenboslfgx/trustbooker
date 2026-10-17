export type CountryCode = string;
export type CurrencyCode = "EUR" | "GBP" | "USD" | string;

export type Provider = {
  id: string;
  slug: string;
  displayName: string;
  headline: string;
  city: string;
  countryCode: CountryCode;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  trustScore: number;
  responseMinutes: number;
  verifiedIdentity: boolean;
  verifiedBusiness: boolean;
  categories: string[];
  startingPriceMinor: number;
  currency: CurrencyCode;
  featuredService: string;
};

export type ServiceRequest = {
  id: string;
  buyerId: string;
  category: string;
  title: string;
  description: string;
  countryCode: CountryCode;
  locality: string;
  budgetMinMinor?: number;
  budgetMaxMinor?: number;
  createdAt: string;
};

export type BookingStatus =
  | "draft"
  | "awaiting_provider"
  | "accepted"
  | "payment_pending"
  | "booked"
  | "in_progress"
  | "completed"
  | "disputed"
  | "cancelled";

export type Booking = {
  id: string;
  buyerId: string;
  providerId: string;
  serviceRequestId?: string;
  status: BookingStatus;
  subtotalMinor: number;
  marketplaceFeeMinor: number;
  currency: CurrencyCode;
};

export type Review = {
  id: string;
  bookingId: string;
  buyerId: string;
  providerId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  verifiedBooking: boolean;
  createdAt: string;
};
