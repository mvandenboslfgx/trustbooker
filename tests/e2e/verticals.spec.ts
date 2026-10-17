import { test, expect } from "@playwright/test";

test("all-in-one discovery shows the three distinct marketplaces", async ({ page }) => {
  await page.goto("/discover");
  await expect(page.getByRole("heading",{level:1})).toContainText("looking");
  await expect(page.getByRole("link",{name:/Explore services & trades/i})).toBeVisible();
  await expect(page.getByRole("link",{name:/Explore jobs & careers/i})).toBeVisible();
  await expect(page.getByRole("link",{name:/Explore events & experiences/i})).toBeVisible();
});

test("vacancy and event directories never invent listings", async ({ page }) => {
  await page.goto("/jobs");
  await expect(page.getByRole("heading",{level:1})).toContainText("Find work");
  await expect(page.getByRole("button",{name:/Find jobs/i})).toBeVisible();
  await expect(page.getByText("North & Co. Home")).toHaveCount(0);
  await page.goto("/events");
  await expect(page.getByRole("heading",{level:1})).toContainText("Make time");
  await expect(page.getByRole("button",{name:/Find events/i})).toBeVisible();
  await expect(page.getByText("North & Co. Home")).toHaveCount(0);
});

test("vacancy and event creation start as private, no paid ticket checkout", async ({page})=>{
  await page.goto("/create?type=job");
  await expect(page.getByRole("heading",{name:"Prepare a job listing"})).toBeVisible();
  await expect(page.getByRole("button",{name:/Save private draft/})).toBeVisible();
  await page.goto("/create?type=event");
  await expect(page.getByRole("heading",{name:"Prepare an event"})).toBeVisible();
  await expect(page.getByText("Free admission only")).toBeVisible();
  await expect(page.getByText("Paid ticket sales stay disabled.")).toBeVisible();
});
