import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Key public pages for visual regression baselines
const publicPages = [
  { name: "homepage", path: "/", waitFor: "h1" },
  { name: "about", path: "/about", waitFor: "h1" },
  { name: "login", path: "/login", waitFor: 'input[type="email"]' },
  { name: "get-started", path: "/get-started", waitFor: "text=What stage" },
  { name: "pricing", path: "/pricing", waitFor: "text=Pro" },
  { name: "contact", path: "/contact", waitFor: "h1" },
];

test.describe("Visual Regression: Public Pages", () => {
  // Skip visual regression in CI if baselines have not been committed yet.
  // To generate baselines: npx playwright test visual-regression --update-snapshots
  // Then commit the tests/e2e/__screenshots__/ directory.
  test.skip(
    () =>
      !!process.env.CI &&
      !fs.existsSync(path.join(__dirname, "__screenshots__")),
    "Visual regression baselines not yet generated. Run: npx playwright test visual-regression --update-snapshots",
  );

  for (const { name, path: pagePath, waitFor } of publicPages) {
    test(`${name} matches baseline screenshot`, async ({ page }) => {
      await page.goto(pagePath);

      // Wait for specific content to ensure page is fully rendered
      await page.waitForSelector(waitFor, { timeout: 10000 });

      // Wait for fonts and images to load
      await page.waitForLoadState("networkidle");

      // Small delay for animations to settle
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage: true,
        // Mask dynamic content that changes between runs
        mask: [
          page.locator("[data-testid='dynamic-content']"),
        ],
      });
    });
  }
});
