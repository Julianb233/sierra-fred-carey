import { test, expect } from "./fixtures/auth";
import * as fs from "fs";
import * as path from "path";

const authenticatedPages = [
  {
    name: "dashboard",
    path: "/dashboard",
    waitFor: "[data-testid='dashboard'], h1, main",
  },
  {
    name: "chat",
    path: "/chat",
    waitFor: "textarea, [data-testid='chat-input']",
  },
  { name: "check-ins", path: "/check-ins", waitFor: "main" },
  {
    name: "dashboard-settings",
    path: "/dashboard/settings",
    waitFor: "main",
  },
];

test.describe("Visual Regression: Authenticated Pages", () => {
  // Skip visual regression in CI if baselines have not been committed yet.
  // To generate baselines: npx playwright test visual-regression --update-snapshots
  // Then commit the tests/e2e/__screenshots__/ directory.
  test.skip(
    () =>
      !!process.env.CI &&
      !fs.existsSync(path.join(__dirname, "__screenshots__")),
    "Visual regression baselines not yet generated. Run: npx playwright test visual-regression --update-snapshots",
  );

  for (const { name, path: pagePath, waitFor } of authenticatedPages) {
    test(`${name} matches baseline screenshot`, async ({
      authenticatedPage: page,
    }) => {
      await page.goto(pagePath);

      // Wait for content to render
      await page.waitForSelector(waitFor, { timeout: 15000 });
      await page.waitForLoadState("networkidle");

      // Wait for animations to settle (longer for authenticated pages with async widgets)
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage: true,
        mask: [
          // Mask user-specific content (names, emails, dates)
          page.locator("[data-testid='user-name']"),
          page.locator("[data-testid='user-email']"),
          page.locator("[data-testid='dynamic-content']"),
          page.locator("time"),
        ],
      });
    });
  }
});
