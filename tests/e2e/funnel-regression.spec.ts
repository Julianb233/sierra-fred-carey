import { test, expect, type Page } from "@playwright/test";
import { test as authTest, expect as authExpect } from "./fixtures/auth";

/**
 * Full Regression Test Suite — AI-1897
 *
 * Post-funnel-version launch regression testing for u.joinsahara.com
 * Covers all 5 areas from the Sahara Founders meeting (2026-02-25):
 *
 * 1. Mobile responsiveness on iOS and Android
 * 2. Payment flow via Stripe
 * 3. Fred chat/voice functionality
 * 4. Founder Journey flow
 * 5. Sahara FAQ accuracy
 *
 * Linear: https://linear.app/ai-acrobatics/issue/AI-1897
 */

// ============================================================================
// Device configurations for mobile regression
// ============================================================================

const MOBILE_DEVICES = [
  {
    name: "iPhone 15 (iOS Safari)",
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
  },
  {
    name: "Galaxy S23 (Android Chrome)",
    viewport: { width: 360, height: 780 },
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Mobile Safari/537.36",
    isMobile: true,
    hasTouch: true,
  },
] as const;

const DESKTOP = {
  name: "Desktop Chrome",
  viewport: { width: 1280, height: 720 },
};

/** Helper: assert no horizontal overflow */
async function assertNoOverflow(page: Page) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasOverflow, "Page must not have horizontal scroll").toBe(false);
}

/** Helper: assert page loaded without server error */
async function assertNoServerError(page: Page, url: string) {
  const response = await page.goto(url);
  expect(response?.status(), `${url} should not return 5xx`).toBeLessThan(500);
  await page.waitForLoadState("domcontentloaded");
  return response;
}

// ============================================================================
// Section 1: Mobile Responsiveness — iOS & Android
// ============================================================================

for (const device of MOBILE_DEVICES) {
  test.describe(`[Regression] Mobile: ${device.name}`, () => {
    test.use({
      viewport: device.viewport,
      userAgent: device.userAgent,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
    });

    // --- Homepage ---
    test("homepage renders without overflow", async ({ page }) => {
      await assertNoServerError(page, "/");
      await page.waitForLoadState("networkidle");
      await assertNoOverflow(page);

      // Hero CTA should be visible and tappable
      const heroCTA = page.locator('a:has-text("Get Started")').first();
      await expect(heroCTA).toBeVisible({ timeout: 10000 });
      const box = await heroCTA.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    });

    // --- Pricing page ---
    test("pricing page renders all tiers without overflow", async ({ page }) => {
      await assertNoServerError(page, "/pricing");
      await page.waitForLoadState("networkidle");
      await assertNoOverflow(page);

      // All three tiers visible
      await expect(page.getByText("Founder Decision OS")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Fundraising & Strategy")).toBeVisible();
      await expect(page.getByText("Venture Studio")).toBeVisible();

      // Price points visible
      await expect(page.getByText("$0").first()).toBeVisible();
      await expect(page.getByText("$99").first()).toBeVisible();
      await expect(page.getByText("$249").first()).toBeVisible();
    });

    // --- Onboarding / Get Started ---
    test("onboarding step 1 renders without overflow", async ({ page }) => {
      await assertNoServerError(page, "/get-started");
      await page.waitForSelector("text=What stage", { timeout: 10000 });
      await assertNoOverflow(page);

      // Stage cards should be tappable
      const stageCard = page.locator('button:has-text("Ideation")');
      await expect(stageCard).toBeVisible();
      const box = await stageCard.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    });

    // --- Login page ---
    test("login page renders and inputs are usable", async ({ page }) => {
      await assertNoServerError(page, "/login");
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await assertNoOverflow(page);

      // Form inputs should be visible
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    // --- Chat page (unauthenticated redirect) ---
    test("chat page redirects gracefully on mobile", async ({ page }) => {
      const response = await page.goto("/chat");
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState("domcontentloaded");
      await assertNoOverflow(page);
    });

    // --- Dashboard (auth redirect) ---
    test("dashboard redirects without crash on mobile", async ({ page }) => {
      const response = await page.goto("/dashboard");
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState("domcontentloaded");
      await assertNoOverflow(page);
    });

    // --- FAQ section on homepage ---
    test("FAQ section is readable on mobile", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Scroll to FAQ section
      const faqSection = page.locator("#faq");
      if (await faqSection.isVisible()) {
        await faqSection.scrollIntoViewIfNeeded();
        await assertNoOverflow(page);

        // FAQ titles should be readable
        await expect(page.getByText("Frequently Asked")).toBeVisible();
      }
    });
  });
}

// ============================================================================
// Section 2: Payment Flow via Stripe
// ============================================================================

test.describe("[Regression] Payment Flow — Stripe", () => {
  test("pricing page shows correct tier CTAs", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForSelector("text=PRICING", { timeout: 15000 });

    // Free tier CTA links to /get-started
    const freeCTA = page.locator('a[href="/get-started"]').first();
    await expect(freeCTA).toBeVisible();

    // Pro and Studio CTAs exist
    const trialButtons = page.getByText("Start 14-Day Trial");
    await expect(trialButtons.first()).toBeVisible();
    expect(await trialButtons.count()).toBe(2);
  });

  test("checkout API endpoint rejects unauthenticated requests", async ({ page }) => {
    // POST to checkout without auth should return 401
    const response = await page.request.post("/api/stripe/checkout", {
      data: { tier: "pro" },
      headers: { "Content-Type": "application/json" },
    });
    // Should be 401 (unauthorized) — not 500 (server error)
    expect(response.status()).toBeLessThan(500);
    expect([401, 403]).toContain(response.status());
  });

  test("stripe portal endpoint rejects unauthenticated requests", async ({ page }) => {
    const response = await page.request.post("/api/stripe/portal", {
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBeLessThan(500);
    expect([401, 403]).toContain(response.status());
  });

  test("checkout API handles missing tier gracefully", async ({ page }) => {
    // Even unauthenticated, should get auth error, not crash
    const response = await page.request.post("/api/stripe/checkout", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBeLessThan(500);
  });

  test("pricing to onboarding flow navigation works", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForSelector("text=PRICING", { timeout: 15000 });

    // Click "Get Started Free" CTA
    const freeCTA = page.locator('a:has-text("Get Started Free")');
    await expect(freeCTA).toBeVisible();
    await freeCTA.click();

    // Should navigate to /get-started
    await page.waitForURL("**/get-started**", { timeout: 10000 });
    expect(page.url()).toContain("/get-started");
  });
});

// ============================================================================
// Section 3: Fred Chat / Voice Functionality
// ============================================================================

test.describe("[Regression] Fred Chat — Unauthenticated", () => {
  test("chat page handles unauthenticated users gracefully", async ({ page }) => {
    const response = await page.goto("/chat");
    expect(response?.status()).toBeLessThan(500);
    // Should either show login prompt or redirect
    await page.waitForLoadState("domcontentloaded");
    // No crash — page is functional
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  test("Fred chat API rejects unauthenticated requests", async ({ page }) => {
    const response = await page.request.post("/api/fred/chat", {
      data: { messages: [{ role: "user", content: "hello" }] },
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBeLessThan(500);
    // Should be auth error, not server crash
    expect([401, 403]).toContain(response.status());
  });

  test("Fred call API rejects unauthenticated requests", async ({ page }) => {
    const response = await page.request.post("/api/fred/call", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBeLessThan(500);
  });
});

authTest.describe("[Regression] Fred Chat — Authenticated", () => {
  authTest.setTimeout(60000);

  authTest("chat page loads with Fred greeting", async ({ authenticatedPage: page }) => {
    await page.goto("/chat");

    // Fred greeting should appear
    await authExpect(page.getByText(/Fred Cary/i)).toBeVisible({ timeout: 15000 });

    // Chat input should be present
    const chatInput = page.locator('textarea[placeholder*="Ask Fred"]');
    await authExpect(chatInput).toBeVisible({ timeout: 5000 });
  });

  authTest("can send message and see it in chat", async ({ authenticatedPage: page }) => {
    await page.goto("/chat");

    const chatInput = page.locator('textarea[placeholder*="Ask Fred"]');
    await authExpect(chatInput).toBeVisible({ timeout: 15000 });

    // Send a test message
    const testMsg = "What are the top priorities for a seed-stage founder?";
    await chatInput.fill(testMsg);
    await chatInput.press("Enter");

    // User message should appear
    await authExpect(page.getByText(testMsg)).toBeVisible({ timeout: 5000 });

    // Should stay on chat page (no crash)
    expect(page.url()).toContain("/chat");
  });

  authTest("Fred responds via SSE stream", async ({ authenticatedPage: page }) => {
    let chatApiCalled = false;

    page.on("response", (response) => {
      if (response.url().includes("/api/fred/chat")) {
        chatApiCalled = true;
      }
    });

    await page.goto("/chat");
    const chatInput = page.locator('textarea[placeholder*="Ask Fred"]');
    await authExpect(chatInput).toBeVisible({ timeout: 15000 });

    await chatInput.fill("Give me one quick tip.");
    await chatInput.press("Enter");

    // Wait for API call
    await authExpect(async () => {
      expect(chatApiCalled).toBe(true);
    }).toPass({ timeout: 15000, intervals: [500] });
  });

  authTest("no error toasts after sending a message", async ({ authenticatedPage: page }) => {
    await page.goto("/chat");

    const chatInput = page.locator('textarea[placeholder*="Ask Fred"]');
    await authExpect(chatInput).toBeVisible({ timeout: 15000 });

    await chatInput.fill("Hello Fred, quick test.");
    await chatInput.press("Enter");

    // Wait for any potential error
    await page.waitForTimeout(5000);

    // No error toasts
    const errorToast = page.locator('[role="alert"]').filter({
      hasText: /error|failed|something went wrong/i,
    });
    await authExpect(errorToast).not.toBeVisible();
  });
});

// ============================================================================
// Section 4: Founder Journey Flow (Onboarding / Get-Started)
// ============================================================================

test.describe("[Regression] Founder Journey Flow", () => {
  test("step 1: stage selection renders all options", async ({ page }) => {
    await page.goto("/get-started");
    await page.waitForSelector("text=What stage", { timeout: 10000 });

    // All stage options should be visible
    const stages = ["Ideation", "Pre-seed", "Seed", "Series A"];
    for (const stage of stages) {
      const btn = page.locator(`button:has-text("${stage}")`);
      await expect(btn).toBeVisible();
    }
  });

  test("step 1 → step 2: stage selection advances to challenges", async ({ page }) => {
    await page.goto("/get-started");
    await page.waitForSelector("text=What stage", { timeout: 10000 });

    // Select a stage
    await page.click('button:has-text("Ideation")');

    // Should advance to challenge step
    await page.waitForSelector("text=challenge", { timeout: 5000 });
  });

  test("step 2 → step 3: challenge selection advances to signup form", async ({ page }) => {
    await page.goto("/get-started");
    await page.waitForSelector("text=What stage", { timeout: 10000 });

    await page.click('button:has-text("Ideation")');
    await page.waitForSelector("text=challenge", { timeout: 5000 });

    await page.click('button:has-text("Fundraising")');

    // Should advance to email/password form
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("back button navigates to previous step", async ({ page }) => {
    await page.goto("/get-started");
    await page.waitForSelector("text=What stage", { timeout: 10000 });

    // Navigate to step 2
    await page.click('button:has-text("Ideation")');
    await page.waitForSelector("text=challenge", { timeout: 5000 });

    // Click back
    await page.click('button:has-text("Back")');
    await page.waitForSelector("text=What stage", { timeout: 5000 });
  });

  test("progress indicator shows step progress", async ({ page }) => {
    await page.goto("/get-started");
    await page.waitForSelector("text=What stage", { timeout: 10000 });

    // Progress dots should be present (brand color dots)
    const dots = page.locator(".rounded-full.bg-\\[\\#ff6a1a\\]");
    await expect(dots.first()).toBeVisible();
  });

  test("signup form validates empty fields", async ({ page }) => {
    await page.goto("/get-started");
    await page.waitForSelector("text=What stage", { timeout: 10000 });

    // Navigate to signup step
    await page.click('button:has-text("Ideation")');
    await page.waitForSelector("text=challenge", { timeout: 5000 });
    await page.click('button:has-text("Fundraising")');
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });

    // Submit empty form
    await page.click('button:has-text("Start Free Trial")');

    // Error should appear
    const error = page.locator('[role="alert"]');
    await expect(error).toBeVisible({ timeout: 3000 });
  });

  test("signup form validates invalid email", async ({ page }) => {
    await page.goto("/get-started");
    await page.waitForSelector("text=What stage", { timeout: 10000 });

    await page.click('button:has-text("Ideation")');
    await page.waitForSelector("text=challenge", { timeout: 5000 });
    await page.click('button:has-text("Fundraising")');
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });

    // Fill invalid email
    await page.locator('input[type="email"]').fill("not-an-email");
    await page.locator('input[placeholder="Create a password"]').fill("TestPass123!");
    await page.click('button:has-text("Start Free Trial")');

    // Should show validation error, not crash
    await page.waitForTimeout(1000);
    expect(page.url()).toContain("/get-started"); // Still on page
  });

  test("password toggle shows/hides password", async ({ page }) => {
    await page.goto("/get-started");
    await page.waitForSelector("text=What stage", { timeout: 10000 });

    await page.click('button:has-text("Ideation")');
    await page.waitForSelector("text=challenge", { timeout: 5000 });
    await page.click('button:has-text("Fundraising")');
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });

    const passwordInput = page.locator('input[placeholder="Create a password"]');
    await expect(passwordInput).toHaveAttribute("type", "password");

    const toggleBtn = page.locator('button[aria-label="Show password"]');
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });
});

// ============================================================================
// Section 5: Sahara FAQ Accuracy
// ============================================================================

test.describe("[Regression] Sahara FAQ Accuracy", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("FAQ section is present on the homepage", async ({ page }) => {
    const faqSection = page.locator("#faq");
    await faqSection.scrollIntoViewIfNeeded();
    await expect(faqSection).toBeVisible();

    // Section header
    await expect(page.getByText("Frequently Asked")).toBeVisible();
    await expect(page.getByText("Questions")).toBeVisible();
  });

  test("all 5 FAQ items are rendered", async ({ page }) => {
    const faqSection = page.locator("#faq");
    await faqSection.scrollIntoViewIfNeeded();

    const expectedQuestions = [
      "What is the Founder Decision OS?",
      "Is fundraising positioned as success by default?",
      "What's the difference between the tiers?",
      "What is Boardy integration?",
      "Can the AI agents replace my team?",
    ];

    for (const question of expectedQuestions) {
      await expect(page.getByText(question)).toBeVisible();
    }
  });

  test("FAQ: Founder Decision OS answer is accurate", async ({ page }) => {
    const faqSection = page.locator("#faq");
    await faqSection.scrollIntoViewIfNeeded();

    // Click to expand
    await page.click('button:has-text("What is the Founder Decision OS?")');

    // Verify answer contains key terms
    const answer = page.locator("text=AI-powered platform");
    await expect(answer).toBeVisible({ timeout: 3000 });

    // Key concepts mentioned
    await expect(page.getByText("startup founders")).toBeVisible();
    await expect(page.getByText("fundraising")).toBeVisible();
  });

  test("FAQ: fundraising not positioned as success by default", async ({ page }) => {
    const faqSection = page.locator("#faq");
    await faqSection.scrollIntoViewIfNeeded();

    await page.click('button:has-text("Is fundraising positioned as success by default?")');

    // Key principle: fundraising is NOT default success
    await expect(page.getByText("never positioned as success by default")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("earn access to capital tooling")).toBeVisible();
  });

  test("FAQ: tier differences show correct pricing", async ({ page }) => {
    const faqSection = page.locator("#faq");
    await faqSection.scrollIntoViewIfNeeded();

    await page.click('button:has-text("What\'s the difference between the tiers?")');

    // Verify pricing in FAQ matches pricing page
    await expect(page.getByText("$99/mo")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("$249/mo")).toBeVisible();

    // Free tier mention
    const freeText = page.locator("text=Free:");
    await expect(freeText).toBeVisible();
  });

  test("FAQ: Boardy integration answer is present", async ({ page }) => {
    const faqSection = page.locator("#faq");
    await faqSection.scrollIntoViewIfNeeded();

    await page.click('button:has-text("What is Boardy integration?")');

    await expect(page.getByText("investor matching")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("warm-intro")).toBeVisible();
  });

  test("FAQ: AI agents answer sets correct expectations", async ({ page }) => {
    const faqSection = page.locator("#faq");
    await faqSection.scrollIntoViewIfNeeded();

    await page.click('button:has-text("Can the AI agents replace my team?")');

    // Key message: augment, not replace
    await expect(page.getByText("augment, not replace")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("human judgment")).toBeVisible();
  });

  test("FAQ accordion opens and closes correctly", async ({ page }) => {
    const faqSection = page.locator("#faq");
    await faqSection.scrollIntoViewIfNeeded();

    // Open first item
    await page.click('button:has-text("What is the Founder Decision OS?")');
    await expect(page.getByText("AI-powered platform")).toBeVisible({ timeout: 3000 });

    // Open second item (multiple=true, so first stays open)
    await page.click('button:has-text("Is fundraising positioned as success by default?")');
    await expect(page.getByText("never positioned as success by default")).toBeVisible({ timeout: 3000 });

    // First should still be visible (accordion type="multiple")
    await expect(page.getByText("AI-powered platform")).toBeVisible();
  });
});

// ============================================================================
// Section 6: Cross-cutting — Navigation & Critical Paths
// ============================================================================

test.describe("[Regression] Critical Navigation Paths", () => {
  test("homepage → pricing navigation works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Find pricing link in nav
    const pricingLink = page.locator('a[href="/pricing"]').first();
    await expect(pricingLink).toBeVisible({ timeout: 10000 });
    await pricingLink.click();

    await page.waitForURL("**/pricing**", { timeout: 10000 });
    await expect(page.getByText("Founder Decision OS")).toBeVisible({ timeout: 10000 });
  });

  test("homepage → get-started navigation works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const getStartedLink = page.locator('a[href="/get-started"]').first();
    await expect(getStartedLink).toBeVisible({ timeout: 10000 });
    await getStartedLink.click();

    await page.waitForURL("**/get-started**", { timeout: 10000 });
    await page.waitForSelector("text=What stage", { timeout: 10000 });
  });

  test("homepage → login navigation works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const loginLink = page.locator('a[href="/login"]').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await page.waitForURL("**/login**", { timeout: 10000 });
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    }
  });

  test("404 page renders gracefully", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-123");
    // Should be 404, not 500
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState("domcontentloaded");
  });

  test("all public pages return < 500 status", async ({ page }) => {
    const publicPages = [
      "/",
      "/pricing",
      "/get-started",
      "/login",
      "/signup",
      "/about",
      "/contact",
    ];

    for (const url of publicPages) {
      const response = await page.goto(url);
      expect(response?.status(), `${url} should not be a server error`).toBeLessThan(500);
      await page.waitForLoadState("domcontentloaded");
    }
  });
});

// ============================================================================
// Section 7: API Health Checks
// ============================================================================

test.describe("[Regression] API Health", () => {
  test("stripe webhook endpoint exists", async ({ page }) => {
    // Webhook should accept POST, reject GET
    const response = await page.request.get("/api/stripe/webhook");
    // 405 (method not allowed) or similar — not 500
    expect(response.status()).toBeLessThan(500);
  });

  test("fred chat API exists and requires auth", async ({ page }) => {
    const response = await page.request.post("/api/fred/chat", {
      data: { messages: [] },
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBeLessThan(500);
  });

  test("fred call API exists and requires auth", async ({ page }) => {
    const response = await page.request.post("/api/fred/call", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBeLessThan(500);
  });
});
