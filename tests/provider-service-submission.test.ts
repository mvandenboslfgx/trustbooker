import { describe, expect, it, vi } from "vitest";
import { completeServiceCreation } from "../src/lib/provider-service-submission";

describe("provider service creation feedback", () => {
  it("keeps the service form unchanged when the backend rejects the request", async () => {
    const reset = vi.fn();
    const refresh = vi.fn(async () => undefined);
    const message = await completeServiceCreation(
      { reset },
      { ok: false, message: "Validation failed." },
      refresh,
    );
    expect(message).toBe("Validation failed.");
    expect(reset).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("resets only the captured form after the backend saves a private service", async () => {
    const reset = vi.fn();
    const refresh = vi.fn(async () => undefined);
    const message = await completeServiceCreation(
      { reset },
      { ok: true, serviceId: "saved-id" },
      refresh,
    );
    expect(reset).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(message).toContain("Service created privately.");
  });

  it("does not report an already-created service as a failure when refresh fails", async () => {
    const reset = vi.fn();
    const refresh = vi.fn(async () => { throw new Error("Refresh failed"); });
    const message = await completeServiceCreation(
      { reset },
      { ok: true, serviceId: "saved-id" },
      refresh,
    );
    expect(reset).toHaveBeenCalledTimes(1);
    expect(message).toContain("Service created privately.");
    expect(message).toContain("Refresh this page");
    expect(message).not.toContain("could not be created");
  });
});
