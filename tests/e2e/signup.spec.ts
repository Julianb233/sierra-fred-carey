import { test, expect } from "@playwright/test";

test.describe("Signup Flow (/get-started)", () => {
  test("should display the onboarding stage selection on /get-started", async ({
    page,
  }) => {
    await page.goto("/get-started");

    // Step 1: Stage selection should be visible
    await expect(page.getByText("What stage are you at?")).toBeVisible();

    // Stage option buttons should be present
    await expect(page.getByText("Ideation")).toBeVisible();
    await expect(page.getByText("Pre-seed")).toBeVisible();
    await expect(page.getByText("Seed")).toBeVisible();
    await expect(page.getByText("Series A+")).toBeVisible();
  });

  test("should advance through onboarding steps to the signup form", async ({
    page,
  }) => {
    await page.goto("/get-started");

    // Step 1: Select a stage
    await page.getByText("Ideation").click();

    // Step 2: Challenge selection should appear
    await expect(
      page.getByText("What's your #1 challenge?"),
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Product-Market Fit")).toBeVisible();

    // Select a challenge
    await page.getByText("Product-Market Fit").click();

    // Step 3: Email/password form should appear
    await expect(page.getByText("Let's get started!")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("should show validation errors for empty email submission", async ({
    page,
  }) => {
    await page.goto("/get-started");

    // Navigate to step 3 (email form)
    await page.getByText("Ideation").click();
    await page.waitForTimeout(500);
    await page.getByText("Product-Market Fit").click();
    await expect(page.getByText("Let's get started!")).toBeVisible({
      timeout: 5000,
    });

    // Click submit without entering email or password
    await page.getByRole("button", { name: /start free trial/i }).click();

    // Should show validation error
    await expect(page.getByText("Please enter your email")).toBeVisible({
      timeout: 3000,
    });
  });

  test("should show validation error for weak password", async ({ page }) => {
    await page.goto("/get-started");

    // Navigate to step 3
    await page.getByText("Ideation").click();
    await page.waitForTimeout(500);
    await page.getByText("Product-Market Fit").click();
    await expect(page.getByText("Let's get started!")).toBeVisible({
      timeout: 5000,
    });

    // Fill email but use a weak password (too short)
    await page.locator('input[type="email"]').fill("test@example.com");
    await page.locator('input[type="password"]').fill("short");
    await page.getByRole("button", { name: /start free trial/i }).click();

    // Should show password validation error
    await expect(
      page.getByText("Password must be at least 8 characters"),
    ).toBeVisible({ timeout: 3000 });
  });
});
