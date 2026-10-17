import { expect, test } from "@playwright/test";

const publicRoutes = ["/", "/marketplace", "/pricing", "/trust-safety", "/privacy", "/terms"];

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
