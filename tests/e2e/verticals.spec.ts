import { test, expect } from "@playwright/test";

test("unified explore has all marketplace verticals", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Start here");
  await expect(page.locator("main").getByRole("link", { name: /Explore services/ })).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: /Explore jobs/ })).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: /Explore events/ })).toBeVisible();
});

test("jobs directory only shows live records and allows employer sign-in", async ({ page }) => {
  await page.goto("/jobs");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Find work");
  await expect(page.getByRole("link", { name: /Sign in to post a vacancy/ })).toBeVisible();
});

test("events do not advertise paid tickets before payments launch", async ({ page }) => {
  await page.goto("/events");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("More to do");
  await expect(page.getByRole("link", { name: /Sign in to create an event/ })).toBeVisible();
  await expect(page.getByText("Paid ticketing and payouts are not enabled.")).toBeVisible();
});

test("cross-marketplace personal activity is private", async ({ page }) => {
  await page.goto("/my-activity");
  await expect(page.getByRole("heading", { name: /Sign in to view your activity/ })).toBeVisible();
});

test("staff moderation page does not expose pending private listings", async ({ page }) => {
  await page.goto("/admin/opportunities");
  await expect(page.getByRole("heading", { name: /Staff access required/ })).toBeVisible();
});
