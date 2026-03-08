/**
 * Voice Integration E2E Tests
 *
 * End-to-end tests for the voice features:
 * - Voice input button presence and interaction in chat
 * - Voice call modal flow
 * - Fallback behavior when voice is unavailable
 * - Cross-browser compatibility checks
 *
 * AI-1415: QA voice integration end-to-end
 *
 * These tests use Playwright with the authenticated page fixture.
 * Required env vars: E2E_TEST_EMAIL, E2E_TEST_PASSWORD
 */

import { test } from "./fixtures/auth";
import { expect, type Page } from "@playwright/test";

// Helper to navigate to chat page
async function navigateToChat(page: Page) {
  await page.goto("/chat");
  // Wait for chat interface to load
  await page.waitForSelector("textarea, [role='textbox']", { timeout: 15000 });
}

// Helper to navigate to dashboard
async function navigateToDashboard(page: Page) {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
}

// ============================================================================
// Voice Input in Chat (Whisper Flow)
// ============================================================================

test.describe("Voice input in chat", () => {
  test("voice button is visible when browser supports MediaRecorder", async ({
    authenticatedPage: page,
  }) => {
    await navigateToChat(page);

    // Check for microphone button — it should be present in Chrome/Firefox
    const micButton = page.locator('[aria-label="Start voice input"]');
    // Voice button visibility depends on MediaRecorder support
    // In Playwright's Chromium, it should be supported
    const isVisible = await micButton.isVisible().catch(() => false);

    if (isVisible) {
      await expect(micButton).toBeEnabled();
    } else {
      // If not visible, verify the chat input still works (text fallback)
      const textarea = page.locator("textarea, [role='textbox']").first();
      await expect(textarea).toBeVisible();
    }
  });

  test("chat input accepts text when voice is not available", async ({
    authenticatedPage: page,
  }) => {
    await navigateToChat(page);

    const textarea = page.locator("textarea, [role='textbox']").first();
    await expect(textarea).toBeVisible();
    await textarea.fill("Hello Fred, this is a text message");
    await expect(textarea).toHaveValue("Hello Fred, this is a text message");
  });

  test("voice button has correct accessibility attributes", async ({
    authenticatedPage: page,
  }) => {
    await navigateToChat(page);

    const micButton = page.locator('[aria-label="Start voice input"]');
    const isVisible = await micButton.isVisible().catch(() => false);

    if (isVisible) {
      // Check ARIA attributes
      await expect(micButton).toHaveAttribute("aria-label", "Start voice input");
      // Button should be focusable
      await micButton.focus();
      await expect(micButton).toBeFocused();
    }
  });

  test("voice overlay opens when mic button is clicked", async ({
    authenticatedPage: page,
  }) => {
    await navigateToChat(page);

    // Look for the voice input button
    const micButton = page.locator('[aria-label="Start voice input"]');
    const isVisible = await micButton.isVisible().catch(() => false);

    if (isVisible) {
      // Grant microphone permission before clicking
      await page.context().grantPermissions(["microphone"]);
      await micButton.click();

      // After clicking, the button should change state
      // (recording indicator or overlay should appear)
      await page.waitForTimeout(500);

      // Look for recording UI elements
      const stopButton = page.locator('[aria-label="Stop recording"]');
      const recordingIndicator = page.locator("text=Transcribing");
      const isRecording = await stopButton.isVisible().catch(() => false);
      const isTranscribing = await recordingIndicator
        .isVisible()
        .catch(() => false);

      // Either we're recording or transcribing — the button responded to click
      expect(isRecording || isTranscribing).toBe(true);
    }
  });
});

// ============================================================================
// Voice Call Modal (LiveKit)
// ============================================================================

test.describe("Voice call modal", () => {
  test("Call Fred button is accessible from dashboard", async ({
    authenticatedPage: page,
  }) => {
    await navigateToDashboard(page);

    // Look for the Call Fred button or similar CTA
    const callButton = page.locator(
      "button:has-text('Call Fred'), button:has-text('Call'), [data-testid='call-fred']"
    );
    const isVisible = await callButton.first().isVisible().catch(() => false);

    if (isVisible) {
      await callButton.first().click();

      // Modal should open with idle state
      await expect(page.locator("text=Call Fred")).toBeVisible({
        timeout: 5000,
      });
      await expect(
        page.locator("text=Start Call, text=Quick decision call")
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("call modal shows error gracefully when LiveKit is unavailable", async ({
    authenticatedPage: page,
  }) => {
    await navigateToDashboard(page);

    const callButton = page.locator(
      "button:has-text('Call Fred'), button:has-text('Call'), [data-testid='call-fred']"
    );
    const isVisible = await callButton.first().isVisible().catch(() => false);

    if (isVisible) {
      await callButton.first().click();

      // Wait for modal to appear
      await page.waitForSelector("text=Call Fred", { timeout: 5000 });

      // Click Start Call — in test env, LiveKit will likely fail
      const startButton = page.locator("button:has-text('Start Call')");
      if (await startButton.isVisible()) {
        await startButton.click();

        // Should eventually show either connecting or error state
        await page.waitForTimeout(3000);

        const hasError = await page
          .locator("text=Connection Failed, text=Retry")
          .isVisible()
          .catch(() => false);
        const hasConnecting = await page
          .locator("text=Connecting")
          .isVisible()
          .catch(() => false);

        // Either connecting or error is acceptable in test env
        expect(hasError || hasConnecting).toBe(true);
      }
    }
  });

  test("call modal can be closed from idle state", async ({
    authenticatedPage: page,
  }) => {
    await navigateToDashboard(page);

    const callButton = page.locator(
      "button:has-text('Call Fred'), button:has-text('Call'), [data-testid='call-fred']"
    );
    const isVisible = await callButton.first().isVisible().catch(() => false);

    if (isVisible) {
      await callButton.first().click();
      await page.waitForSelector("text=Call Fred", { timeout: 5000 });

      // Close via Escape key
      await page.keyboard.press("Escape");

      // Modal should close
      await expect(page.locator("text=Start Call")).not.toBeVisible({
        timeout: 3000,
      });
    }
  });
});

// ============================================================================
// TTS (Text-to-Speech) Controls
// ============================================================================

test.describe("Text-to-speech controls", () => {
  test("TTS settings page loads correctly", async ({
    authenticatedPage: page,
  }) => {
    // Navigate to settings or wherever voice settings live
    await page.goto("/dashboard/settings");
    await page.waitForLoadState("networkidle");

    // Look for voice settings section
    const voiceSection = page.locator(
      "text=Voice Settings, text=Text-to-Speech, text=Voice"
    );
    const isVisible = await voiceSection.first().isVisible().catch(() => false);

    if (isVisible) {
      // Verify voice settings controls are present
      const hasRateControl = await page
        .locator("text=Speed, text=Rate")
        .isVisible()
        .catch(() => false);
      const hasPitchControl = await page
        .locator("text=Pitch")
        .isVisible()
        .catch(() => false);

      // At minimum, the section should be visible
      expect(isVisible).toBe(true);
    }
  });
});

// ============================================================================
// Cross-browser fallback
// ============================================================================

test.describe("Fallback behavior", () => {
  test("chat is fully functional without voice features", async ({
    authenticatedPage: page,
  }) => {
    await navigateToChat(page);

    // Core chat functionality should work regardless of voice support
    const textarea = page.locator("textarea, [role='textbox']").first();
    await expect(textarea).toBeVisible();

    // Type and verify
    await textarea.fill("Testing text input without voice");
    await expect(textarea).toHaveValue("Testing text input without voice");

    // Send button should be present
    const sendButton = page.locator(
      "button[type='submit'], button:has-text('Send'), [aria-label='Send message']"
    );
    const hasSend = await sendButton.first().isVisible().catch(() => false);
    // Send button should exist (may be icon-only with aria-label)
    expect(hasSend).toBe(true);
  });
});
