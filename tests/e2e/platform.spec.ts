import { expect, test } from "@playwright/test";

const publicRoutes = ["/", "/marketplace", "/pricing", "/trust-safety", "/privacy", "/terms"];

test("critical public routes render successfully", async ({ request }) => {
  for (const path of publicRoutes) {
    const response = await request.get(path);
    expect(response.status(), `${path} should not fail`).toBeLessThan(400);
  }
});

test("liveness endpoint is cache-safe and healthy", async ({ request }) => {
  const response = await request.get("/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  await expect(response.json()).resolves.toEqual({ status: "ok", service: "trustbooker" });
});

test("readiness fails closed when Supabase is not configured", async ({ request }) => {
  const response = await request.get("/ready");
  expect(response.status()).toBe(503);
  await expect(response.json()).resolves.toEqual({ status: "not_ready" });
});

test("global responses include baseline browser security headers", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin-allow-popups");
  expect(headers["x-request-id"]).toBeTruthy();
});
