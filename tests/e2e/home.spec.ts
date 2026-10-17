import { test, expect } from "@playwright/test";

test("homepage presents the real-trust marketplace, useful categories and honest signals", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("real trust");
  await expect(page.getByRole("link", { name: "Post a job" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Every kind of help." }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "North & Co. Home" })).toHaveCount(0);
});

test("marketplace does not present fictional example providers as live professionals", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("great professional");
  await expect(page.getByText("North & Co. Home")).toHaveCount(0);
});
