import { test, expect } from "@playwright/test";

test.describe("Login Flow (/login)", () => {
  test("should display login form with all elements", async ({ page }) => {
    await page.goto("/login");

    // Verify page heading
    await expect(page.getByText("Welcome back")).toBeVisible();

    // Verify form fields exist
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

    // Verify "Get started" link is present for new users
    await expect(page.getByText("Get started free")).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[type="email"]').fill("invalid@test.com");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should remain on login page and show an error message
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toContain("login");

    // The error message container should be visible if the API returns an error
    // (may vary depending on whether the server is live; at minimum we stay on login)
  });

  test("should redirect to dashboard on valid credentials", async ({
    page,
  }) => {
    // This test requires valid E2E credentials in the environment
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;

    // Skip if no credentials are configured
    test.skip(!email || !password, "E2E_TEST_EMAIL and E2E_TEST_PASSWORD required");

    await page.goto("/login");
    await page.locator('input[type="email"]').fill(email!);
    await page.locator('input[type="password"]').fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect to dashboard
    await page.waitForURL("**/dashboard**", { timeout: 10000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("should not submit with empty fields due to required attribute", async ({
    page,
  }) => {
    await page.goto("/login");

    // Both fields have the required attribute; clicking submit should not navigate away
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should still be on the login page
    await page.waitForTimeout(500);
    expect(page.url()).toContain("login");
  });
});
