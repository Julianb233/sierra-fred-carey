import { test, expect } from "./fixtures/auth";

test.describe("Reality Lens", () => {
  test("should load Reality Lens page", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/reality-lens");
    await expect(page.locator("h1, h2").first()).toBeVisible({
      timeout: 10000,
    });
  });
});
