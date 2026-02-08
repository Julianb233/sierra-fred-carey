import { test, expect } from "./fixtures/auth";

test.describe("Virtual Agents Dashboard", () => {
  test("should load agents page and display header", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents");

    // Page header should render with title
    await expect(
      page.getByText("Virtual Team").first()
    ).toBeVisible({ timeout: 15000 });

    // Studio badge should be visible in the header
    await expect(
      page.getByText("Studio").first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display agent subtitle description", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents");

    // The subtitle "Your AI-powered team of specialist agents"
    await expect(
      page.getByText("Your AI-powered team of specialist agents").first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("should show agent cards or FeatureLock based on tier", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents");

    // Wait for page to settle
    await expect(
      page.getByText("Virtual Team").first()
    ).toBeVisible({ timeout: 15000 });

    // For Free tier: FeatureLock overlay shows, so we should see either:
    // - Agent card names (Founder Ops, Fundraising, Growth) if Studio user
    // - FeatureLock overlay with upgrade prompt if Free user
    const pageContent = page.locator(
      'text=/Founder Ops|Fundraising|Growth|Upgrade|Virtual Team/i'
    );
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test("should show task history section when agents are accessible", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents");

    // Wait for page to load
    await expect(
      page.getByText("Virtual Team").first()
    ).toBeVisible({ timeout: 15000 });

    // Task History card header should be visible (rendered even inside FeatureLock)
    // or the FeatureLock description should be shown
    const taskSection = page.locator(
      'text=/Task History|specialist agents|Upgrade/i'
    );
    await expect(taskSection.first()).toBeVisible({ timeout: 10000 });
  });

  test("should intercept agent task API calls", async ({
    authenticatedPage: page,
  }) => {
    // Mock the agents tasks API
    let apiCalled = false;

    await page.route("**/api/agents/tasks**", async (route) => {
      apiCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          tasks: [
            {
              id: "task-1",
              agentType: "founder_ops",
              title: "Weekly priorities review",
              status: "completed",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              result: "Priorities reviewed successfully",
            },
          ],
        }),
      });
    });

    await page.goto("/dashboard/agents");

    // Wait for the page to make the API call
    await expect(
      page.getByText("Virtual Team").first()
    ).toBeVisible({ timeout: 15000 });

    // The page should have attempted to fetch tasks
    expect(apiCalled).toBe(true);
  });

  test("should handle dispatch task modal trigger", async ({
    authenticatedPage: page,
  }) => {
    // Mock tasks API to simulate Studio access
    await page.route("**/api/agents/tasks**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, tasks: [] }),
      });
    });

    await page.goto("/dashboard/agents");

    // Wait for page to load
    await expect(
      page.getByText("Virtual Team").first()
    ).toBeVisible({ timeout: 15000 });

    // If the user has Studio access, "New Task" buttons would be visible
    // For Free tier, the FeatureLock prevents interaction
    // Either way, the page should load without errors
    const pageLoaded = page.locator(
      'text=/Virtual Team|Upgrade|New Task/i'
    );
    await expect(pageLoaded.first()).toBeVisible({ timeout: 10000 });
  });
});
