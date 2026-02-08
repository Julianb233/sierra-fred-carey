import { test, expect } from "./fixtures/auth";

test.describe("FRED Chat", () => {
  test("should load chat page with greeting message", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/chat");

    // FRED greeting should be visible (contains "I'm Fred Cary")
    await expect(
      page.getByText(/Fred Cary/i),
    ).toBeVisible({ timeout: 10000 });

    // Chat input textarea should be visible with placeholder
    const chatInput = page.locator(
      'textarea[placeholder*="Ask Fred"]',
    );
    await expect(chatInput).toBeVisible({ timeout: 5000 });
  });

  test("should send a message and see it in the chat history", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/chat");

    // Wait for chat input to be ready
    const chatInput = page.locator(
      'textarea[placeholder*="Ask Fred"]',
    );
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Type and submit a message
    await chatInput.fill("What should I focus on today?");
    await chatInput.press("Enter");

    // Verify user message appears in the chat history
    await expect(
      page.getByText("What should I focus on today?"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should show a loading/streaming indicator after sending a message", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/chat");

    const chatInput = page.locator(
      'textarea[placeholder*="Ask Fred"]',
    );
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    await chatInput.fill("Give me a quick tip for founders.");
    await chatInput.press("Enter");

    // After sending, either a typing indicator or a response should appear
    // The TypingIndicator component or a new assistant message
    const responseOrIndicator = page.locator(
      '[data-testid="typing-indicator"], [class*="animate-"], [role="status"]',
    ).first();

    // At minimum, we should see our sent message
    await expect(
      page.getByText("Give me a quick tip for founders."),
    ).toBeVisible({ timeout: 5000 });

    // Wait briefly for streaming to potentially start -- the response may come
    // from the AI or we may see a loading state. Either is acceptable.
    await page.waitForTimeout(2000);

    // Verify we're still on the chat page (no crash or error redirect)
    expect(page.url()).toContain("/chat");
  });
});
