import { test, expect } from "@playwright/test";

test.describe("Signup Flow (/start-now)", () => {
  test("renders the capture-first founder signup form", async ({ page }) => {
    await page.goto("/start-now");

    await expect(page.getByRole("heading", { name: "Reserve your founder seat." })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Name" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Phone" })).toBeVisible();
    await expect(page.getByRole("button", { name: /reserve my founder seat/i })).toBeVisible();

    await expect(page.getByText("What stage are you at?")).toHaveCount(0);
    await expect(page.getByText("What's your #1 challenge?")).toHaveCount(0);
  });

  test("redirects legacy /get-started into /start-now with source attribution", async ({ page }) => {
    await page.goto("/get-started?ref=founder-123");

    await page.waitForURL("**/start-now?ref=founder-123&source=get-started", {
      timeout: 10000,
    });
    await expect(page.getByText("Save your spot")).toBeVisible();
  });

  test("captures contact info before account creation", async ({ page }) => {
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
      password: "Sahara2026",
      challenges: [],
      isQuickOnboard: true,
    });
  });

  test("validates phone and consent before capture", async ({ page }) => {
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
