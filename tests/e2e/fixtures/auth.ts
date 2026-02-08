import { test as base, expect, type Page } from "@playwright/test";

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto("/login");
    await page.fill(
      'input[type="email"]',
      process.env.E2E_TEST_EMAIL || "test@example.com",
    );
    await page.fill(
      'input[type="password"]',
      process.env.E2E_TEST_PASSWORD || "testpassword123",
    );
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 10000 });
    await use(page);
  },
});

export { expect };
