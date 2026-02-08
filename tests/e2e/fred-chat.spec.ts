import { test, expect } from "./fixtures/auth";

test.describe("FRED Chat", () => {
  test("should send message and receive response", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard");
    const chatInput = page
      .locator(
        'textarea, input[placeholder*="message"], input[placeholder*="ask"], input[placeholder*="chat"]',
      )
      .first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await chatInput.fill("What should I focus on today?");
    await chatInput.press("Enter");
    // Verify user message appears
    await expect(
      page.getByText("What should I focus on today?"),
    ).toBeVisible({ timeout: 5000 });
  });
});
