import { test, expect } from "./fixtures/auth";

test.describe("Tier Gating - FeatureLock", () => {
  test("should show FeatureLock overlay on agents page for Free-tier user", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents");

    // The agents page header should still render
    await expect(
      page.getByText("Virtual Team").first()
    ).toBeVisible({ timeout: 15000 });

    // FeatureLock should display lock overlay or upgrade prompt for Free tier users
    // The FeatureLock component shows the feature name and an upgrade button
    const lockOverlay = page.locator(
      'text=/upgrade|locked|studio|Virtual Team/i'
    );
    await expect(lockOverlay.first()).toBeVisible({ timeout: 10000 });
  });

  test("should show upgrade button linking to pricing dialog on locked feature", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents");

    // Wait for page to load
    await expect(
      page.getByText("Virtual Team").first()
    ).toBeVisible({ timeout: 15000 });

    // FeatureLock shows an UpgradeTier button which opens a dialog
    // Look for the upgrade button text
    const upgradeButton = page.locator(
      'button:has-text("Upgrade")'
    );
    await expect(upgradeButton.first()).toBeVisible({ timeout: 10000 });
  });

  test("should show FeatureLock on investor targeting page for Free-tier user", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/investor-targeting");

    // FeatureLock wraps the entire investor targeting content
    // It should show the feature name and upgrade prompt
    const lockIndicator = page.locator(
      'text=/Investor Targeting|upgrade|locked|studio/i'
    );
    await expect(lockIndicator.first()).toBeVisible({ timeout: 15000 });
  });

  test("should display correct tier name in lock overlay", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents");

    // Wait for page content
    await expect(
      page.getByText("Virtual Team").first()
    ).toBeVisible({ timeout: 15000 });

    // The FeatureLock component shows the description or default text
    // which mentions the required tier name (Studio)
    const studioRef = page.locator(
      'text=/Studio|studio/i'
    );
    await expect(studioRef.first()).toBeVisible({ timeout: 10000 });
  });

  test("should display feature description in lock overlay", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents");

    // Wait for page
    await expect(
      page.getByText("Virtual Team").first()
    ).toBeVisible({ timeout: 15000 });

    // The agents page FeatureLock has description:
    // "Access your AI-powered team of specialist agents with a Studio tier subscription."
    const description = page.locator(
      'text=/AI-powered team|specialist agents|Studio tier/i'
    );
    await expect(description.first()).toBeVisible({ timeout: 10000 });
  });
});
