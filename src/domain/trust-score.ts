export type TrustSignals = {
  identityVerified: boolean;
  businessVerified: boolean;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  disputeRate: number;
};

export function calculateTrustScore(signals: TrustSignals): number {
  const rating = Math.min(5, Math.max(0, signals.rating));
  const reviewDepth = Math.min(1, Math.log10(signals.reviewCount + 1) / 2);
  const completionDepth = Math.min(1, Math.log10(signals.completedJobs + 1) / 2.5);
  const disputePenalty = Math.min(1, Math.max(0, signals.disputeRate)) * 18;

  const score =
    40 +
    (signals.identityVerified ? 12 : 0) +
    (signals.businessVerified ? 8 : 0) +
    (rating / 5) * 20 +
    reviewDepth * 10 +
    completionDepth * 10 -
    disputePenalty;

  return Math.round(Math.min(100, Math.max(0, score)));
}
