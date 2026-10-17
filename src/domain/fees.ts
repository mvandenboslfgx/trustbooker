export function calculateSuccessFee(subtotalMinor: number, rate = 0.1): number {
  if (!Number.isInteger(subtotalMinor) || subtotalMinor < 0) {
    throw new RangeError("subtotalMinor must be a non-negative integer");
  }
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new RangeError("rate must be between 0 and 1");
  }
  return Math.round(subtotalMinor * rate);
}

export function calculateProviderNet(subtotalMinor: number, rate = 0.1): number {
  return subtotalMinor - calculateSuccessFee(subtotalMinor, rate);
}
