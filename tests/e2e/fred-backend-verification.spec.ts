import { test, expect } from "./fixtures/auth";

test.describe("FRED Backend Reliability Verification", () => {
  test.setTimeout(60000); // FRED responses can take time due to LLM calls

  test("should complete a full FRED chat round-trip without errors", async ({
    authenticatedPage: page,
  }) => {
    // Navigate to chat
    await page.goto("/chat");

    // Wait for FRED greeting to appear (proves page loaded and chat initialized)
    await expect(page.getByText(/Fred Cary/i)).toBeVisible({ timeout: 15000 });

    // Chat input should be ready
    const chatInput = page.locator('textarea[placeholder*="Ask Fred"]');
    await expect(chatInput).toBeVisible({ timeout: 5000 });

    // Send a test message
    const testMessage = "What are the most important things for a first-time founder to focus on?";
    await chatInput.fill(testMessage);
    await chatInput.press("Enter");

    // Verify user message appears in the conversation
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 5000 });

    // Wait for FRED's response to complete (assistant message appears after greeting)
    // The conversation log has role="log" — wait for a second assistant message
    // beyond the greeting. We detect this by waiting for the typing indicator to
    // disappear AND a new text block to appear.
    const conversationLog = page.locator('[role="log"]');

    // Wait for response: either typing indicator disappears or response text appears
    // FRED should respond within 30s even on slow LLM calls
    await expect(async () => {
      // Count assistant-style messages (messages that aren't the user's)
      // The greeting + at least one response = at least 2 non-user messages
      const allText = await conversationLog.textContent();
      // Response should contain substantive content (more than just the greeting)
      expect(allText!.length).toBeGreaterThan(200);
      // The typing indicator should have gone away (response complete)
      const typingIndicator = page.locator('[data-testid="typing-indicator"]');
      await expect(typingIndicator).not.toBeVisible();
    }).toPass({ timeout: 45000, intervals: [1000, 2000, 3000] });

    // Verify no error states on the page
    // Check we're still on the chat page (no error redirect)
    expect(page.url()).toContain("/chat");

    // No error toasts or error messages should be visible
    const errorToast = page.locator('[role="alert"]').filter({ hasText: /error|failed|something went wrong/i });
    await expect(errorToast).not.toBeVisible();
  });

  test("should handle consecutive messages without breaking", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/chat");

    const chatInput = page.locator('textarea[placeholder*="Ask Fred"]');
    await expect(chatInput).toBeVisible({ timeout: 15000 });

    // Send first message
    await chatInput.fill("Hello Fred");
    await chatInput.press("Enter");
    await expect(page.getByText("Hello Fred")).toBeVisible({ timeout: 5000 });

    // Wait for first response to start streaming (brief pause)
    await page.waitForTimeout(3000);

    // Send second message (tests conversation state management)
    await chatInput.fill("What should I focus on first?");
    await chatInput.press("Enter");
    await expect(page.getByText("What should I focus on first?")).toBeVisible({ timeout: 5000 });

    // Verify page remains stable after consecutive messages
    await page.waitForTimeout(5000);
    expect(page.url()).toContain("/chat");

    // Conversation log should contain both user messages
    const conversationLog = page.locator('[role="log"]');
    await expect(conversationLog).toContainText("Hello Fred");
    await expect(conversationLog).toContainText("What should I focus on first?");
  });

  test("should receive SSE events from FRED chat API", async ({
    authenticatedPage: page,
  }) => {
    // This test verifies the backend SSE stream works correctly by
    // intercepting the network request to /api/fred/chat
    let chatApiCalled = false;
    let sseContentType = false;

    page.on("response", (response) => {
      if (response.url().includes("/api/fred/chat")) {
        chatApiCalled = true;
        const contentType = response.headers()["content-type"] || "";
        if (contentType.includes("text/event-stream")) {
          sseContentType = true;
        }
      }
    });

    await page.goto("/chat");
    const chatInput = page.locator('textarea[placeholder*="Ask Fred"]');
    await expect(chatInput).toBeVisible({ timeout: 15000 });

    // Send a message to trigger the API call
    await chatInput.fill("Give me one quick tip.");
    await chatInput.press("Enter");

    // Wait for the API call to happen
    await expect(async () => {
      expect(chatApiCalled).toBe(true);
    }).toPass({ timeout: 15000, intervals: [500] });

    // Verify SSE content type was used
    expect(sseContentType).toBe(true);
  });
});
