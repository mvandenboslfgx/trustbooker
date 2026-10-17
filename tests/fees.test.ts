import { describe, expect, it } from "vitest";
import { calculateProviderNet, calculateSuccessFee } from "@domain/fees";
describe("marketplace fee economics", () => {
  it("charges ten percent by default", () => expect(calculateSuccessFee(10000)).toBe(1000));
  it("preserves integer minor units", () => expect(calculateSuccessFee(999)).toBe(100));
  it("derives provider net deterministically", () => expect(calculateProviderNet(10000)).toBe(9000));
  it("rejects invalid money", () => expect(() => calculateSuccessFee(-1)).toThrow(RangeError));
});
