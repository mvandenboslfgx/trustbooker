import { expect, test } from "@playwright/test";

const publicRoutes = ["/", "/marketplace", "/pricing", "/trust-safety", "/privacy", "/terms"];

test("critical public routes render successfully", async ({ request }) => {
  for (const path of publicRoutes) {
    const response = await request.get(path);
    expect(response.status(), `${path} should not fail`).toBeLessThan(400);
  }
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
