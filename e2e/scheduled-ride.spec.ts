import { expect, test, type Page } from "@playwright/test";

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test("schedule a ride for tomorrow, see it upcoming, cancel it, then start another early", async ({ page }) => {
  // Two bookings end to end outgrow the default 30 s per-test budget.
  test.setTimeout(90_000);
  const errors = trackConsoleErrors(page);

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Sam Scheduler");
  await page.getByLabel("Email").fill(`sched-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("ride1234");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/preferences$/);
  await page.getByLabel("Max price").fill("80");
  await page.getByRole("button", { name: "Save and plan a ride" }).click();
  await expect(page).toHaveURL(/\/ride\/new$/);

  // Schedule: tomorrow, morning, 9:00 AM
  await page.getByRole("radio", { name: "Schedule" }).click();
  await page.getByRole("radiogroup", { name: "Pickup day" }).getByRole("radio", { name: "Tomorrow" }).click();
  await page.getByRole("radiogroup", { name: "Time of day" }).getByRole("radio", { name: "Morning" }).click();
  await page.getByRole("radiogroup", { name: "Pickup time" }).getByRole("radio", { name: /^9:00\sAM$/ }).click();
  await expect(page.getByText("Pickup Tomorrow, 9:00 AM.")).toBeVisible();
  await page.getByRole("button", { name: "City Hall, 100 Main St" }).click();
  await page.getByRole("button", { name: "Harbor Market, 9 Pier Way" }).click();
  await page.getByRole("button", { name: "Find rides for Tomorrow, 9:00 AM" }).click();

  // Compare shows the schedule and reserved pickups
  await expect(page).toHaveURL(/\/ride\/compare$/);
  await expect(page.getByText("Scheduled · Tomorrow, 9:00 AM")).toBeVisible();
  const options = page.getByTestId("ride-option");
  await expect(options.first()).toBeVisible();
  expect(await options.count()).toBeGreaterThanOrEqual(3);
  await expect(options.first().getByText("Pickup at")).toBeVisible();

  // Book → confirm sheet mentions the pickup time
  await options.first().getByRole("button", { name: /^Book this ride/ }).click();
  const confirm = page.getByRole("dialog", { name: "Confirm your ride" });
  await expect(confirm).toContainText("Pickup Tomorrow, 9:00 AM");
  await confirm.getByRole("button", { name: /^Confirm booking/ }).click();

  await expect(page.getByRole("heading", { name: "Ride scheduled" })).toBeVisible();
  await expect(page.getByTestId("scheduled-time")).toHaveText("Tomorrow, 9:00 AM");
  await expect(page.getByTestId("toast")).toContainText("scheduled");
  await page.reload();
  await expect(page.getByTestId("scheduled-time")).toHaveText("Tomorrow, 9:00 AM");
  const rideUrl = page.url();

  // History: upcoming filter
  await page.getByRole("link", { name: "History" }).click();
  await page.getByRole("radio", { name: /Upcoming/ }).click();
  await expect(page.getByTestId("history-item")).toHaveCount(1);
  await expect(page.getByTestId("history-item")).toContainText("Upcoming");
  await expect(page.getByTestId("history-item")).toContainText("Pickup Tomorrow, 9:00 AM");

  // Cancel it
  await page.goto(rideUrl);
  await page.getByRole("button", { name: "Cancel ride" }).click();
  await page.getByRole("dialog", { name: "Cancel this ride?" }).getByRole("button", { name: "Yes, cancel ride" }).click();
  await expect(page.getByRole("heading", { name: "Ride cancelled" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Ride cancelled" })).toBeVisible();

  // The draft keeps the schedule: book again and start it early (demo)
  await page.goto("/ride/compare");
  await expect(page.getByText("Scheduled · Tomorrow, 9:00 AM")).toBeVisible();
  await options.first().getByRole("button", { name: /^Book this ride/ }).click();
  await confirm.getByRole("button", { name: /^Confirm booking/ }).click();
  await expect(page.getByRole("heading", { name: "Ride scheduled" })).toBeVisible();
  await page.getByRole("button", { name: "Start ride now (demo)" }).click();
  await expect(page.getByRole("heading", { name: "Ride booked" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Trip stages" }).getByText("Driver assigned")).toBeVisible();
  await page.getByRole("button", { name: "Skip to end" }).click();
  await expect(page.getByRole("heading", { name: "Ride complete" })).toBeVisible();

  // History: one cancelled, one to rate; the rating asks about punctuality
  await page.getByRole("link", { name: "History" }).click();
  await expect(page.getByTestId("history-item")).toHaveCount(2);
  await expect(page.getByTestId("history-item").filter({ hasText: "Cancelled" })).toHaveCount(1);
  await page.getByTestId("history-item").filter({ hasText: "Not rated yet" }).getByRole("link").click();
  await expect(page).toHaveURL(/\/rate$/);
  await expect(page.getByText("You asked: On-time pickup, Tomorrow, 9:00 AM")).toBeVisible();

  expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
});
