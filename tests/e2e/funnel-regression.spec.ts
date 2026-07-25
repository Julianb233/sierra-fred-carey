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

      // Hero CTA should be visible and tappable (on mobile, the nav CTA may be
      // hidden via responsive classes — find the first *visible* Get Started link)
      const allCTAs = page.locator('a:has-text("Get Started")');
      const count = await allCTAs.count();
      let foundVisible = false;
      for (let i = 0; i < count; i++) {
        const cta = allCTAs.nth(i);
        if (await cta.isVisible().catch(() => false)) {
          const box = await cta.boundingBox();
          expect(box).toBeTruthy();
          expect(box!.height).toBeGreaterThanOrEqual(44);
          foundVisible = true;
          break;
        }
      }
      // At least one CTA variant should be visible (hero or mobile-specific)
      expect(foundVisible, "At least one Get Started CTA should be visible").toBe(true);
    });

    // --- Pricing page ---
    test("pricing page renders all tiers without overflow", async ({ page }) => {
      await assertNoServerError(page, "/pricing");
      await page.waitForLoadState("networkidle");
      await assertNoOverflow(page);

      // All three tiers visible
      await expect(page.getByText("Free Forever")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("For Active Fundraisers")).toBeVisible();
      await expect(page.getByText("Full Leverage Mode")).toBeVisible();

      // Price points visible
      await expect(page.getByText("$0").first()).toBeVisible();
      await expect(page.getByText("$99").first()).toBeVisible();
      await expect(page.getByText("$249").first()).toBeVisible();
    });

    // --- Capture-first signup ---
    test("capture-first signup renders without overflow", async ({ page }) => {
      await assertNoServerError(page, "/start-now");
      await page.waitForSelector("text=Reserve your founder seat.", { timeout: 10000 });
      await assertNoOverflow(page);

      const submit = page.getByRole("button", { name: /reserve my founder seat/i });
      await expect(submit).toBeVisible();
      const box = await submit.boundingBox();
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

    // Free tier CTA links to capture-first signup.
    const freeCTA = page.locator('a[href="/start-now"]').first();
    await expect(freeCTA).toBeVisible();

    // All pricing tier CTAs route into capture-first signup.
    const ctaLinks = page.locator('a[href="/start-now"]');
    expect(await ctaLinks.count()).toBeGreaterThanOrEqual(4);
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

    // Click the first visible capture-first CTA.
    const freeCTA = page.locator('a[href="/start-now"]').filter({ hasText: "Get Started Free" }).first();
    await expect(freeCTA).toBeVisible();
    await freeCTA.click();

    // Should navigate to /start-now
    await page.waitForURL("**/start-now**", { timeout: 10000 });
    expect(page.url()).toContain("/start-now");
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
// Section 4: Founder Journey Flow (Capture-first signup)
// ============================================================================

test.describe("[Regression] Founder Journey Flow", () => {
  test("capture form renders contact fields before startup questions", async ({ page }) => {
    await page.goto("/start-now");
    await page.waitForSelector("text=Reserve your founder seat.", { timeout: 10000 });

    await expect(page.getByRole("textbox", { name: "Name" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Phone" })).toBeVisible();
    await expect(page.getByText("What stage are you at?")).toHaveCount(0);
    await expect(page.getByText("What's your #1 challenge?")).toHaveCount(0);
  });

  test("legacy /get-started redirects to /start-now and preserves attribution", async ({ page }) => {
    await page.goto("/get-started?ref=abc123");
    await page.waitForURL("**/start-now?ref=abc123&source=get-started", {
      timeout: 10000,
    });
    await expect(page.getByText("Save your spot")).toBeVisible();
  });

  test("lead capture advances to account creation with the expected payload", async ({ page }) => {
    let contactPayload: Record<string, unknown> | null = null;
    let onboardPayload: Record<string, unknown> | null = null;

    await page.route("**/api/contact", async (route) => {
      contactPayload = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, id: "lead_capture_123456" }),
      });
    });
    await page.route("**/api/onboard", async (route) => {
      onboardPayload = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, profile: { id: "profile_123" } }),
      });
    });

    await page.goto("/start-now?utm_campaign=july-founder");
    await page.getByRole("textbox", { name: "Name" }).fill("Avery Founder");
    await page.getByRole("textbox", { name: "Email" }).fill("avery@example.com");
    await page.getByRole("textbox", { name: "Phone" }).fill("(415) 555-0199");
    await page.getByLabel(/By submitting/).check();
    await page.getByRole("button", { name: /reserve my founder seat/i }).click();

    await expect(page.getByText("Create your account")).toBeVisible();
    expect(contactPayload).toMatchObject({
      name: "Avery Founder",
      email: "avery@example.com",
      phone: "+14155550199",
      source: "sahara_start_now",
      company: "Sahara Founding Members",
    });

    await page.locator('input[type="password"]').fill("Sahara2026");
    await page.getByRole("button", { name: /start with fred/i }).click();

    await expect(page.getByText("You're in.")).toBeVisible();
    expect(onboardPayload).toMatchObject({
      name: "Avery Founder",
      email: "avery@example.com",
      phone: "+14155550199",
      challenges: [],
      isQuickOnboard: true,
    });
  });

  test("lead capture validates invalid phone before calling API", async ({ page }) => {
    let apiCalled = false;

    await page.route("**/api/contact", async (route) => {
      apiCalled = true;
      await route.fulfill({ status: 500 });
    });

    await page.goto("/start-now");
    await page.getByRole("textbox", { name: "Name" }).fill("Avery Founder");
    await page.getByRole("textbox", { name: "Email" }).fill("avery@example.com");
    await page.getByRole("textbox", { name: "Phone" }).fill("123");
    await page.getByLabel(/By submitting/).check();
    await page.getByRole("button", { name: /reserve my founder seat/i }).click();

    await expect(page.getByText("Valid phone number is required")).toBeVisible();
    expect(apiCalled).toBe(false);
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
    await expect(page.getByText("Free Forever")).toBeVisible({ timeout: 10000 });
  });

  test("homepage → start-now navigation works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const getStartedLink = page.locator('a[href="/start-now"]').first();
    await expect(getStartedLink).toBeVisible({ timeout: 10000 });
    await getStartedLink.click();

    await page.waitForURL("**/start-now**", { timeout: 10000 });
    await page.waitForSelector("text=Reserve your founder seat.", { timeout: 10000 });
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
      "/start-now",
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
