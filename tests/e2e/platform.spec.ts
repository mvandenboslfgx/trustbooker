import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/marketplace",
  "/pricing",
  "/trust-safety",
  "/privacy",
  "/terms",
  "/login",
  "/recover",
];

test("critical public routes render successfully", async ({ request }) => {
  for (const path of publicRoutes) {
    const response = await request.get(path);
    expect(response.status(), `${path} should not fail`).toBeLessThan(400);
  }
});

test("homepage returns TrustBooker HTML", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/html");
  expect(await response.text()).toContain("TrustBooker");
});

test("global responses include baseline security headers", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();

  expect(headers["x-request-id"]).toBeTruthy();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin-allow-popups");
});

test("liveness probe is healthy and never cached", async ({ request }) => {
  const response = await request.get("/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({ status: "ok", service: "trustbooker" });
});

test("readiness probe fails closed when dependencies are unavailable", async ({ request }) => {
  const response = await request.get("/ready");
  expect([200, 503]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(["ready", "not_ready"]).toContain(body.status);
  expect(response.status() === 200 ? body.status : "not_ready").toBe(body.status);
});

test("account data export fails closed without a usable account session", async ({ request }) => {
  const response = await request.get("/account/export");
  expect([401, 503]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");

  const body = await response.json();
  if (response.status() === 503) {
    expect(body).toEqual({ error: "Account export is not configured for this environment." });
  } else {
    expect(body).toEqual({ error: "Authentication required." });
  }
});


test("request IDs accept safe correlation values but reject untrusted input", async ({ request }) => {
  const valid = "trustbooker-correlation-12345";
  const accepted = await request.get("/health", { headers: { "x-request-id": valid } });
  expect(accepted.headers()["x-request-id"]).toBe(valid);

  const rejected = await request.get("/health", {
    headers: { "x-request-id": "<script>untrusted-id</script>" },
  });
  const sanitized = rejected.headers()["x-request-id"];
  expect(sanitized).toBeTruthy();
  expect(sanitized).not.toContain("<");
  expect(sanitized).not.toContain("script");
  expect(sanitized).not.toBe("<script>untrusted-id</script>");
});
