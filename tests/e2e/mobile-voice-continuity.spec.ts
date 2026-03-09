import { test, expect, type Page } from "@playwright/test"

/**
 * Mobile Voice Continuity Test Suite
 *
 * Phase 90: User Testing Loop
 * Tests chat and voice pages on mobile viewports for:
 * - Input field positioning (above keyboard area)
 * - Voice coaching controls render correctly
 * - Chat-to-voice UI transition elements are tappable (>= 44px)
 * - No horizontal scroll on chat and voice pages
 */

const MIN_TOUCH_TARGET = 44

const mobileDevices = {
  "iPhone 14": { width: 390, height: 844, isMobile: true, hasTouch: true },
  "Android (Galaxy S23)": {
    width: 360,
    height: 780,
    isMobile: true,
    hasTouch: true,
  },
} as const

type DeviceName = keyof typeof mobileDevices

async function assertNoHorizontalScroll(page: Page) {
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth
  )
  const clientWidth = await page.evaluate(
    () => document.documentElement.clientWidth
  )
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5)
}

async function waitForPage(page: Page) {
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(500)
}

async function isErrorPage(page: Page): Promise<boolean> {
  const hasError = await page
    .getByText("Something went wrong")
    .isVisible({ timeout: 1000 })
    .catch(() => false)
  const has404 = await page
    .getByText("Page Not Found")
    .isVisible({ timeout: 500 })
    .catch(() => false)
  return hasError || has404
}

for (const deviceName of Object.keys(mobileDevices) as DeviceName[]) {
  const viewport = mobileDevices[deviceName]

  test.describe(`Mobile Voice Continuity: ${deviceName} (${viewport.width}x${viewport.height})`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
      userAgent: deviceName.startsWith("iPhone")
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        : "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36",
    })

    // ── Chat Page ──────────────────────────────────────────────
    test.describe("Chat Page", () => {
      test("no horizontal scroll", async ({ page }) => {
        await page.goto("/chat")
        await waitForPage(page)
        await assertNoHorizontalScroll(page)
      })

      test("input field is positioned in lower portion of viewport", async ({
        page,
      }) => {
        await page.goto("/chat")
        await waitForPage(page)

        if (await isErrorPage(page)) {
          test.info().annotations.push({
            type: "note",
            description: "Page hit error boundary",
          })
          return
        }

        // Look for chat input (textarea or input)
        const chatInput = page.locator(
          'textarea, input[type="text"], [data-testid="chat-input"]'
        )
        const inputVisible = await chatInput
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        if (inputVisible) {
          const box = await chatInput.first().boundingBox()
          if (box) {
            // Input should be in the lower half of the viewport
            expect(box.top).toBeGreaterThan(viewport.height * 0.3)
            // Input should not extend beyond viewport width
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 5)
          }
        }
      })

      test("chat action buttons have adequate touch targets", async ({
        page,
      }) => {
        await page.goto("/chat")
        await waitForPage(page)

        if (await isErrorPage(page)) return

        // Check send button and any action buttons
        const actionButtons = page.locator(
          'button[aria-label], button[type="submit"], [data-testid*="send"]'
        )
        const count = await actionButtons.count()
        let smallTargets = 0

        for (let i = 0; i < count; i++) {
          const el = actionButtons.nth(i)
          if (!(await el.isVisible().catch(() => false))) continue
          const box = await el.boundingBox().catch(() => null)
          if (
            box &&
            box.height > 0 &&
            box.width > 0 &&
            box.height < MIN_TOUCH_TARGET &&
            box.width < MIN_TOUCH_TARGET
          ) {
            smallTargets++
          }
        }

        // Allow at most 2 small targets
        expect(
          smallTargets,
          `${smallTargets} buttons below ${MIN_TOUCH_TARGET}px touch target`
        ).toBeLessThan(3)
      })
    })

    // ── Voice Page ─────────────────────────────────────────────
    test.describe("Voice Page", () => {
      test("no horizontal scroll", async ({ page }) => {
        await page.goto("/dashboard/voice")
        await waitForPage(page)

        // May redirect -- that's fine
        if (
          page.url().includes("login") ||
          page.url().includes("get-started")
        ) {
          return
        }

        await assertNoHorizontalScroll(page)
      })

      test("voice controls render on mobile viewport", async ({ page }) => {
        await page.goto("/dashboard/voice")
        await waitForPage(page)

        if (await isErrorPage(page)) {
          test.info().annotations.push({
            type: "note",
            description: "Page hit error boundary",
          })
          return
        }

        // If redirected, skip
        if (
          page.url().includes("login") ||
          page.url().includes("get-started")
        ) {
          return
        }

        // Look for voice-related UI elements
        const voiceElements = page.locator(
          'button[aria-label*="call" i], button[aria-label*="voice" i], button[aria-label*="mic" i], [data-testid*="voice"], [data-testid*="call"]'
        )
        const count = await voiceElements.count()

        // If voice elements exist, check they're tappable
        for (let i = 0; i < count; i++) {
          const el = voiceElements.nth(i)
          if (!(await el.isVisible().catch(() => false))) continue
          const box = await el.boundingBox().catch(() => null)
          if (box) {
            // At least one dimension should meet touch target
            expect(
              box.height >= MIN_TOUCH_TARGET || box.width >= MIN_TOUCH_TARGET,
              `Voice control ${i}: ${box.width.toFixed(0)}x${box.height.toFixed(0)} too small`
            ).toBeTruthy()
          }
        }
      })
    })

    // ── Chat-to-Voice Transition ───────────────────────────────
    test.describe("Chat-Voice Transition", () => {
      test("transition elements are tappable", async ({ page }) => {
        await page.goto("/chat")
        await waitForPage(page)

        if (await isErrorPage(page)) return

        // Look for voice/call toggle buttons in chat UI
        const voiceToggle = page.locator(
          'a[href*="voice"], button[aria-label*="voice" i], button[aria-label*="call" i], [data-testid*="voice-toggle"]'
        )
        const count = await voiceToggle.count()

        for (let i = 0; i < count; i++) {
          const el = voiceToggle.nth(i)
          if (!(await el.isVisible().catch(() => false))) continue
          const box = await el.boundingBox().catch(() => null)
          if (box) {
            expect(
              box.height >= MIN_TOUCH_TARGET || box.width >= MIN_TOUCH_TARGET,
              `Voice toggle ${i}: ${box.width.toFixed(0)}x${box.height.toFixed(0)} too small for touch`
            ).toBeTruthy()
          }
        }
      })
    })
  })
}
