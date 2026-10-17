import { test, expect } from "@playwright/test";
test("homepage exposes trust-first marketplace proposition", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("real trust");
  await expect(page.getByRole("link", { name: "Post a job" })).toBeVisible();
});
