export type RankingSignals = {
  relevance: number;
  trustScore: number;
  rating: number;
  completedJobs: number;
  responseMinutes: number;
  distanceKm?: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function calculateOrganicRank(signals: RankingSignals): number {
  const relevance = clamp01(signals.relevance);
  const trust = clamp01(signals.trustScore / 100);
  const rating = clamp01(signals.rating / 5);
  const history = clamp01(Math.log10(signals.completedJobs + 1) / 3);
  const response = 1 - clamp01(signals.responseMinutes / 720);
  const locality = signals.distanceKm == null ? 0.7 : 1 - clamp01(signals.distanceKm / 100);

  return Number(
    (relevance * 0.34 + trust * 0.24 + rating * 0.16 + history * 0.1 + response * 0.08 + locality * 0.08).toFixed(6),
  );
}
