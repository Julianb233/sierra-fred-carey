import { test as base, expect, type Page } from "@playwright/test";

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, provide, testInfo) => {
    if (!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD) {
      testInfo.skip(true, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set — skipping authenticated test");
      return;
    }
    await page.goto("/login");
    await page.fill(
      'input[type="email"]',
      process.env.E2E_TEST_EMAIL!,
    );
    await page.fill(
      'input[type="password"]',
      process.env.E2E_TEST_PASSWORD!,
    );
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 10000 });
    await provide(page);
  },
});

export { expect };
