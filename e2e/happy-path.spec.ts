import { expect, test, type Page } from "@playwright/test";

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test("sign up → preferences → compare → book → trip → rate → history", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const email = `rider-${Date.now()}@example.com`;

  // Landing
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Compare rides");
  await page.getByRole("link", { name: "Create account" }).click();

  // Sign up (with an inline validation check first)
  await expect(page).toHaveURL(/\/signup$/);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await page.getByLabel("Name").fill("Ada Rider");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("ride1234");
  await page.getByRole("button", { name: "Create account" }).click();

  // Onboarding preferences
  await expect(page).toHaveURL(/\/preferences$/);
  await expect(page.getByRole("heading", { name: "Set your ride preferences" })).toBeVisible();
  await page.getByLabel("Max price").fill("60");
  await page.getByLabel("Max pickup wait").fill("12");
  await page.getByRole("switch", { name: /Quiet ride/ }).click();
  await page.getByRole("switch", { name: /Eco vehicle/ }).click();
  await page.getByText("Cool", { exact: true }).click();
  await page.getByText("Comfort", { exact: true }).click();
  await page.getByRole("button", { name: "Save and plan a ride" }).click();

  // New ride: price, wait, quiet, temperature, eco → 5 active preferences
  await expect(page).toHaveURL(/\/ride\/new$/);
  await page.getByRole("button", { name: "Union Station, 50 Front St" }).click();
  await page.getByRole("button", { name: "Riverside Park, 400 River Rd" }).click();
  await expect(page.getByLabel("Pickup", { exact: true })).toHaveValue("Union Station, 50 Front St");
  await expect(page.getByLabel("Destination", { exact: true })).toHaveValue("Riverside Park, 400 River Rd");
  await page.getByRole("button", { name: "Find rides" }).click();

  // Compare: skeleton, then 3–4 options side by side
  await expect(page).toHaveURL(/\/ride\/compare$/);
  await expect(page.getByRole("status", { name: "Loading ride options" })).toBeVisible();
  const options = page.getByTestId("ride-option");
  await expect(options.first()).toBeVisible();
  const count = await options.count();
  expect(count).toBeGreaterThanOrEqual(3);
  expect(count).toBeLessThanOrEqual(4);
  for (let i = 0; i < count; i++) await expect(options.nth(i)).toBeVisible();
  await expect(options.first().getByText(/\d\/5 match/)).toBeVisible();
  await expect(page.getByText("Best match").first()).toBeVisible();

  // Table toggle shows the same options, then back to columns
  await page.getByRole("radio", { name: "Table" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("table").getByRole("button", { name: /^Book this ride/ })).toHaveCount(count);
  await page.getByRole("radio", { name: "Side by side" }).click();

  // Reload keeps state (session, draft, preferences)
  await page.reload();
  await expect(page).toHaveURL(/\/ride\/compare$/);
  await expect(options).toHaveCount(count);

  // Book the first option
  await options.first().getByRole("button", { name: /^Book this ride/ }).click();
  await expect(page).toHaveURL(/\/ride\/(?!compare$|new$)[^/]+$/);
  await expect(page.getByRole("heading", { name: "Ride booked" })).toBeVisible();
  const rideUrl = page.url();
  await expect(page.getByRole("list", { name: "Trip progress" }).getByText("Driver assigned")).toBeVisible();

  // Skip to end
  await page.getByRole("button", { name: "Skip to end" }).click();
  await expect(page.getByRole("heading", { name: "Ride complete" })).toBeVisible();

  // Reload keeps the completed trip
  await page.reload();
  await expect(page.getByRole("heading", { name: "Ride complete" })).toBeVisible();
  await page.getByRole("link", { name: "Rate this ride" }).click();

  // Rate every snapshotted preference
  await expect(page).toHaveURL(/\/rate$/);
  const prefGroups = page.locator("fieldset").filter({ hasText: "You asked:" });
  await expect(prefGroups).toHaveCount(5);
  const n = await prefGroups.count();
  for (let i = 0; i < n; i++) {
    // Mark the last one "Partly" to check the summary counts only "Yes".
    await prefGroups.nth(i).getByText(i === n - 1 ? "Partly" : "Yes", { exact: true }).click();
  }
  await page.getByPlaceholder("What happened?").first().fill("Right on budget");
  await page.getByLabel("4 stars").check({ force: true });
  await page.getByRole("button", { name: "Submit rating" }).click();
  await expect(page.getByTestId("rating-summary")).toHaveText("Met 4 of 5 preferences");

  // History shows the ride with the right summary, and survives a reload
  await page.getByRole("link", { name: "View ride history" }).click();
  await expect(page).toHaveURL(/\/history$/);
  const item = page.getByTestId("history-item");
  await expect(item).toHaveCount(1);
  await expect(item).toContainText("Met 4 of 5 preferences");
  await page.reload();
  await expect(item).toContainText("Met 4 of 5 preferences");

  // Tap for details
  await item.getByRole("link").click();
  await expect(page).toHaveURL(rideUrl);
  await expect(page.getByTestId("rating-summary")).toHaveText("Met 4 of 5 preferences");
  await expect(page.getByText("“Right on budget”")).toBeVisible();

  // Log out, protected route redirects, log back in keeps data
  await page.getByRole("link", { name: "Account" }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/history");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("ride1234");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/ride\/new$/);
  await page.getByRole("link", { name: "History" }).click();
  await expect(page.getByTestId("history-item")).toContainText("Met 4 of 5 preferences");

  expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
});

test("empty states offer a next action", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Empty State");
  await page.getByLabel("Email").fill(`empty-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("ride1234");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/preferences$/);

  await page.goto("/history");
  await expect(page.getByRole("link", { name: "Book your first ride" })).toBeVisible();
  await page.goto("/ride/compare");
  await expect(page.getByRole("link", { name: "Plan a ride" })).toBeVisible();
  await page.goto("/ride/does-not-exist");
  await expect(page.getByRole("link", { name: "Plan a new ride" })).toBeVisible();

  expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
});
