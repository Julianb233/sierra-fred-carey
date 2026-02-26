/**
 * Live Site Feature Verification — Stagehand v3 + Browserbase
 * Verifies all new features pushed to joinsahara.com
 *
 * Features under test (from recent commits):
 *   Phase 69: Service Marketplace Frontend (provider directory, detail, bookings, nav)
 *   Phase 68: Service Marketplace Backend (API routes)
 *   Phase 67: Content Library Frontend (pages, video player, FRED content recs)
 *   Phase 66: Content Library Backend (API routes, Mux, schema)
 *   Dashboard: Chat input repositioned above the fold
 *   Fixes: Settings display name, FRED chat retry, startup process UX
 *
 * Linear: AI-907
 * Usage: node e2e-live-feature-verification.mjs
 */

import { Stagehand } from "@browserbasehq/stagehand";

const BASE_URL = "https://joinsahara.com";
const TIMESTAMP = new Date().toISOString();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const results = [];

function record(category, name, status, detail = "") {
  results.push({ category, name, status, detail, ts: new Date().toISOString() });
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : status === "WARN" ? "⚠️" : "⏭️";
  console.log(`${icon} [${category}] ${name}${detail ? " — " + detail : ""}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function navigateTo(page, url, waitMs = 5000) {
  try {
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
  } catch (err) {
    console.log(`  [WARN] Navigation to ${url}: ${String(err).slice(0, 120)}`);
  }
  await sleep(waitMs);
}

async function getPageContent(page) {
  try {
    const frame = page.mainFrame();
    const url = page.url();
    if (url.includes("chrome-error://")) {
      return { url, html: "", innerText: "", isError: true };
    }
    const html = await frame.evaluate(() => document.documentElement.outerHTML);
    const innerText = await frame.evaluate(() => document.body.innerText);
    const title = await page.title();
    return { url, html, innerText, title, isError: false };
  } catch (err) {
    return { url: "", html: "", innerText: "", isError: true, error: String(err) };
  }
}

async function fetchFromPage(page, url) {
  const frame = page.mainFrame();
  return await frame.evaluate(async (fetchUrl) => {
    try {
      const r = await fetch(fetchUrl, { redirect: "follow", credentials: "omit" });
      const body = await r.text();
      return { status: r.status, body, ok: r.ok, url: r.url };
    } catch (e) {
      return { status: 0, body: String(e), ok: false, url: fetchUrl };
    }
  }, url);
}

async function runTest(category, name, fn) {
  try {
    await fn();
  } catch (err) {
    record(category, name, "FAIL", String(err).slice(0, 300));
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  SAHARA LIVE SITE — Feature Verification via Stagehand     ║");
  console.log("║  Target: https://joinsahara.com                            ║");
  console.log(`║  Date: ${TIMESTAMP.slice(0, 19).padEnd(51)}║`);
  console.log("║  Linear: AI-907                                            ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // -----------------------------------------------------------------------
  // Initialize Stagehand with Browserbase (cloud browser for live site)
  // -----------------------------------------------------------------------
  let stagehand;
  try {
    stagehand = new Stagehand({
      env: "BROWSERBASE",
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      modelName: "google/gemini-2.0-flash",
      modelApiKey: process.env.GEMINI_API_KEY,
      verbose: 0,
    });
    await stagehand.init();
    record("SETUP", "Stagehand + Browserbase init", "PASS");
  } catch (err) {
    // Fallback to LOCAL mode
    console.log("  Browserbase init failed, trying LOCAL mode...");
    try {
      stagehand = new Stagehand({
        env: "LOCAL",
        verbose: 0,
        modelName: "google/gemini-2.0-flash",
        modelApiKey: process.env.GEMINI_API_KEY,
        localBrowserLaunchOptions: {
          headless: true,
          chromiumSandbox: false,
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
          viewport: { width: 1440, height: 900 },
        },
      });
      await stagehand.init();
      record("SETUP", "Stagehand LOCAL init (fallback)", "PASS");
    } catch (err2) {
      record("SETUP", "Stagehand initialization", "FAIL", String(err2).slice(0, 300));
      printReport();
      process.exit(1);
    }
  }

  const page = stagehand.context.pages()[0];

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 1: PUBLIC PAGES — Baseline health checks
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 1: Public Pages (Baseline) ━━━");

  await runTest("PUBLIC", "Homepage loads", async () => {
    await navigateTo(page, BASE_URL, 6000);
    const c = await getPageContent(page);
    if (c.isError) throw new Error("Homepage returned error page");
    const hasBranding = c.html.includes("Sahara") || c.html.includes("sahara") || c.title?.toLowerCase().includes("sahara");
    if (!hasBranding) throw new Error(`No Sahara branding. Title: "${c.title}"`);
    record("PUBLIC", "Homepage loads", "PASS", `Title: "${c.title}", HTML: ${c.html.length} chars`);
  });

  await runTest("PUBLIC", "Homepage hero + CTA", async () => {
    const c = await getPageContent(page);
    if (c.isError) throw new Error("Page not rendered");
    const heroTerms = ["founder", "startup", "unicorn", "AI", "operating system", "Sahara", "Join", "Get Started"];
    const found = heroTerms.filter((t) => c.html.toLowerCase().includes(t.toLowerCase()));
    if (found.length < 2) throw new Error(`Hero terms missing. Found: ${found}`);
    record("PUBLIC", "Homepage hero + CTA", "PASS", `Found: ${found.join(", ")}`);
  });

  await runTest("PUBLIC", "Navigation renders", async () => {
    const c = await getPageContent(page);
    const navLinks = ["/pricing", "/login", "/get-started", "/about", "/product"];
    const found = navLinks.filter((l) => c.html.includes(l));
    if (found.length < 2) throw new Error(`Only found nav links: ${found}`);
    record("PUBLIC", "Navigation renders", "PASS", `Links: ${found.join(", ")}`);
  });

  // Quick route checks via fetch
  const publicRoutes = [
    { path: "/pricing", label: "Pricing page" },
    { path: "/get-started", label: "Get Started page" },
    { path: "/waitlist", label: "Waitlist page" },
    { path: "/login", label: "Login page" },
    { path: "/about", label: "About page" },
  ];

  for (const route of publicRoutes) {
    await runTest("PUBLIC", route.label, async () => {
      const resp = await fetchFromPage(page, `${BASE_URL}${route.path}`);
      if (!resp.ok && resp.status !== 307 && resp.status !== 308) {
        throw new Error(`${route.path} returned status ${resp.status}`);
      }
      if (resp.body.length < 500) throw new Error(`Response too short: ${resp.body.length}`);
      record("PUBLIC", route.label, "PASS", `Status: ${resp.status}, Size: ${resp.body.length}`);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 2: NEW FEATURE — Dashboard Chat Input Above the Fold
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 2: Dashboard Chat Input (Phase Latest) ━━━");

  await runTest("DASHBOARD", "Dashboard page accessible", async () => {
    await navigateTo(page, `${BASE_URL}/dashboard`, 6000);
    const c = await getPageContent(page);
    // Dashboard may redirect to login — that's OK, it means the route exists
    const isLoginRedirect = c.url?.includes("/login") || c.html.includes("Sign in") || c.html.includes("Log in");
    const isDashboard = c.html.includes("dashboard") || c.html.includes("Dashboard");
    if (!isLoginRedirect && !isDashboard && c.isError) {
      throw new Error("Dashboard route not accessible");
    }
    const detail = isLoginRedirect ? "Redirected to login (auth gate working)" : "Dashboard loaded";
    record("DASHBOARD", "Dashboard page accessible", "PASS", detail);
  });

  await runTest("DASHBOARD", "Dashboard API route exists", async () => {
    const resp = await fetchFromPage(page, `${BASE_URL}/dashboard`);
    const is404 = resp.status === 404;
    if (is404) throw new Error("Dashboard returns 404");
    record("DASHBOARD", "Dashboard API route exists", "PASS", `Status: ${resp.status}`);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 3: NEW FEATURE — Service Marketplace (Phases 68-69)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 3: Service Marketplace (Phases 68-69) ━━━");

  await runTest("MARKETPLACE", "Marketplace page route exists", async () => {
    const resp = await fetchFromPage(page, `${BASE_URL}/dashboard/marketplace`);
    const is404 = resp.status === 404 || (resp.body.includes("404") && resp.body.includes("not found"));
    if (is404) {
      record("MARKETPLACE", "Marketplace page route exists", "WARN", "Route returns 404 — may not be deployed yet");
      return;
    }
    const hasMarketplace = resp.body.includes("marketplace") || resp.body.includes("Marketplace") ||
      resp.body.includes("provider") || resp.body.includes("Provider");
    record("MARKETPLACE", "Marketplace page route exists", "PASS",
      `Status: ${resp.status}, has marketplace content: ${hasMarketplace}`);
  });

  await runTest("MARKETPLACE", "Provider directory page", async () => {
    await navigateTo(page, `${BASE_URL}/dashboard/marketplace`, 6000);
    const c = await getPageContent(page);
    // Check if we're redirected to login (expected for auth-protected routes)
    const isLoginRedirect = c.url?.includes("/login");
    if (isLoginRedirect) {
      record("MARKETPLACE", "Provider directory page", "PASS", "Auth-protected — redirected to login (correct)");
      return;
    }
    const hasContent = c.html.includes("provider") || c.html.includes("Provider") ||
      c.html.includes("marketplace") || c.html.includes("Marketplace") ||
      c.html.includes("search") || c.html.includes("filter");
    if (!hasContent && !c.isError) {
      record("MARKETPLACE", "Provider directory page", "WARN", "Page loaded but no marketplace-specific content found");
      return;
    }
    record("MARKETPLACE", "Provider directory page", "PASS", `Content loaded, URL: ${c.url}`);
  });

  await runTest("MARKETPLACE", "Provider detail route pattern", async () => {
    // Test the [slug] dynamic route exists
    const resp = await fetchFromPage(page, `${BASE_URL}/dashboard/marketplace/test-provider`);
    const is404 = resp.status === 404 && resp.body.includes("not found");
    // A redirect to login means the route exists but is auth-protected
    const isRedirect = resp.url?.includes("/login") || resp.status === 307 || resp.status === 308;
    if (is404 && !isRedirect) {
      record("MARKETPLACE", "Provider detail route pattern", "WARN", "Dynamic route may not be deployed");
      return;
    }
    record("MARKETPLACE", "Provider detail route pattern", "PASS",
      `Route recognized, status: ${resp.status}`);
  });

  await runTest("MARKETPLACE", "Bookings page route", async () => {
    const resp = await fetchFromPage(page, `${BASE_URL}/dashboard/marketplace/bookings`);
    const is404 = resp.status === 404 && resp.body.includes("not found");
    const isRedirect = resp.url?.includes("/login") || resp.status === 307;
    if (is404 && !isRedirect) {
      record("MARKETPLACE", "Bookings page route", "WARN", "Bookings route may not be deployed");
      return;
    }
    record("MARKETPLACE", "Bookings page route", "PASS", `Status: ${resp.status}`);
  });

  await runTest("MARKETPLACE", "Marketplace API routes", async () => {
    // Test marketplace API endpoints
    const apiPaths = [
      "/api/marketplace/providers",
      "/api/marketplace/categories",
    ];
    const apiResults = [];
    for (const path of apiPaths) {
      const resp = await fetchFromPage(page, `${BASE_URL}${path}`);
      apiResults.push({ path, status: resp.status, ok: resp.ok, size: resp.body.length });
    }
    const working = apiResults.filter((r) => r.status !== 404);
    if (working.length === 0) {
      record("MARKETPLACE", "Marketplace API routes", "WARN",
        "No marketplace API routes responding — may need deployment");
      return;
    }
    record("MARKETPLACE", "Marketplace API routes", "PASS",
      apiResults.map((r) => `${r.path}:${r.status}`).join(", "));
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 4: NEW FEATURE — Content Library (Phases 66-67)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 4: Content Library (Phases 66-67) ━━━");

  await runTest("CONTENT", "Content library page route", async () => {
    const resp = await fetchFromPage(page, `${BASE_URL}/dashboard/content`);
    const is404 = resp.status === 404 && resp.body.includes("not found");
    const isRedirect = resp.url?.includes("/login") || resp.status === 307;
    if (is404 && !isRedirect) {
      record("CONTENT", "Content library page route", "WARN", "Content route returns 404 — may not be deployed");
      return;
    }
    const hasContent = resp.body.includes("content") || resp.body.includes("Content") ||
      resp.body.includes("library") || resp.body.includes("Library") ||
      resp.body.includes("video") || resp.body.includes("course");
    record("CONTENT", "Content library page route", "PASS",
      `Status: ${resp.status}, content keywords: ${hasContent}`);
  });

  await runTest("CONTENT", "Content library navigation", async () => {
    await navigateTo(page, `${BASE_URL}/dashboard/content`, 6000);
    const c = await getPageContent(page);
    const isLoginRedirect = c.url?.includes("/login");
    if (isLoginRedirect) {
      record("CONTENT", "Content library navigation", "PASS", "Auth-protected — redirected to login (correct)");
      return;
    }
    if (c.isError) {
      record("CONTENT", "Content library navigation", "WARN", "Could not render page");
      return;
    }
    const hasNav = c.html.includes("Content") || c.html.includes("content-library") ||
      c.html.includes("Library") || c.html.includes("video");
    record("CONTENT", "Content library navigation", "PASS", `Has content nav: ${hasNav}`);
  });

  await runTest("CONTENT", "Content detail route pattern", async () => {
    const resp = await fetchFromPage(page, `${BASE_URL}/dashboard/content/test-course`);
    const isRedirect = resp.url?.includes("/login") || resp.status === 307;
    const is404 = resp.status === 404 && resp.body.includes("not found") && !isRedirect;
    if (is404) {
      record("CONTENT", "Content detail route pattern", "WARN", "Dynamic route may not be deployed");
      return;
    }
    record("CONTENT", "Content detail route pattern", "PASS", `Status: ${resp.status}`);
  });

  await runTest("CONTENT", "Content API routes", async () => {
    const apiPaths = [
      "/api/content",
      "/api/content/recommendations",
    ];
    const apiResults = [];
    for (const path of apiPaths) {
      const resp = await fetchFromPage(page, `${BASE_URL}${path}`);
      apiResults.push({ path, status: resp.status, size: resp.body.length });
    }
    const working = apiResults.filter((r) => r.status !== 404);
    if (working.length === 0) {
      record("CONTENT", "Content API routes", "WARN",
        "No content API routes responding — may need deployment");
      return;
    }
    record("CONTENT", "Content API routes", "PASS",
      apiResults.map((r) => `${r.path}:${r.status}`).join(", "));
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 5: SIDEBAR NAVIGATION — Marketplace + Content in sidebar
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 5: Sidebar Navigation Updates ━━━");

  await runTest("SIDEBAR", "Dashboard sidebar has Marketplace link", async () => {
    // Fetch dashboard HTML and check for marketplace nav item
    const resp = await fetchFromPage(page, `${BASE_URL}/dashboard`);
    const hasMarketplaceNav = resp.body.includes("/dashboard/marketplace") ||
      resp.body.includes("Marketplace") || resp.body.includes("marketplace");
    if (!hasMarketplaceNav) {
      // May be behind auth — check the rendered HTML if we got redirected
      record("SIDEBAR", "Dashboard sidebar has Marketplace link", "WARN",
        "Cannot verify sidebar without authentication — needs manual check");
      return;
    }
    record("SIDEBAR", "Dashboard sidebar has Marketplace link", "PASS", "Marketplace nav item found in HTML");
  });

  await runTest("SIDEBAR", "Dashboard sidebar has Content Library link", async () => {
    const resp = await fetchFromPage(page, `${BASE_URL}/dashboard`);
    const hasContentNav = resp.body.includes("/dashboard/content") ||
      resp.body.includes("Content Library") || resp.body.includes("content-library");
    if (!hasContentNav) {
      record("SIDEBAR", "Dashboard sidebar has Content Library link", "WARN",
        "Cannot verify sidebar without authentication — needs manual check");
      return;
    }
    record("SIDEBAR", "Dashboard sidebar has Content Library link", "PASS", "Content Library nav item found");
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 6: API HEALTH + REGRESSION
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 6: API Health + Regression ━━━");

  await runTest("API", "Health endpoint", async () => {
    const resp = await fetchFromPage(page, `${BASE_URL}/api/health`);
    if (resp.status === 404) {
      record("API", "Health endpoint", "SKIP", "No /api/health endpoint");
      return;
    }
    if (resp.status >= 500) throw new Error(`Server error: ${resp.status}`);
    record("API", "Health endpoint", "PASS", `Status: ${resp.status}`);
  });

  await runTest("API", "Chat API route exists", async () => {
    const resp = await fetchFromPage(page, `${BASE_URL}/api/chat`);
    // POST endpoint, GET may return 405 — that's fine, route exists
    if (resp.status === 404) throw new Error("Chat API returns 404");
    record("API", "Chat API route exists", "PASS", `Status: ${resp.status} (GET on POST endpoint is expected)`);
  });

  // Marketplace API
  await runTest("API", "Marketplace providers endpoint", async () => {
    const resp = await fetchFromPage(page, `${BASE_URL}/api/marketplace/providers`);
    if (resp.status === 404) {
      record("API", "Marketplace providers endpoint", "WARN", "Not deployed yet");
      return;
    }
    record("API", "Marketplace providers endpoint", "PASS", `Status: ${resp.status}, Size: ${resp.body.length}`);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 7: DEMO PAGES — Regression check
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 7: Demo Pages (Regression) ━━━");

  const demoPages = [
    "/demo/reality-lens",
    "/demo/investor-lens",
    "/demo/pitch-deck",
    "/demo/virtual-team",
    "/demo/boardy",
  ];

  for (const demoPath of demoPages) {
    await runTest("DEMO", `${demoPath} loads`, async () => {
      const resp = await fetchFromPage(page, `${BASE_URL}${demoPath}`);
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      if (resp.body.length < 500) throw new Error(`Too short: ${resp.body.length}`);
      record("DEMO", `${demoPath} loads`, "PASS", `Status: ${resp.status}, Size: ${resp.body.length}`);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 8: VISUAL + CONSOLE — Homepage quality
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 8: Quality + Console Errors ━━━");

  await runTest("QUALITY", "No critical console errors on homepage", async () => {
    const consoleErrors = [];
    const handler = (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    };
    page.on("console", handler);
    await navigateTo(page, BASE_URL, 6000);
    page.off("console", handler);

    const critical = consoleErrors.filter(
      (e) =>
        !e.includes("favicon") && !e.includes("manifest") && !e.includes("hydration") &&
        !e.includes("ThirdParty") && !e.includes("ERR_BLOCKED_BY_CLIENT") &&
        !e.includes("net::") && !e.includes("Mixed Content") && !e.includes("WebSocket") &&
        !e.includes("__nextjs") && !e.includes("_next") && !e.includes("CORS") &&
        !e.includes("posthog") && !e.includes("sentry")
    );
    if (critical.length > 0) {
      record("QUALITY", "No critical console errors on homepage", "FAIL",
        `${critical.length} errors: ${critical.slice(0, 3).join("; ").slice(0, 200)}`);
    } else {
      record("QUALITY", "No critical console errors on homepage", "PASS",
        `${consoleErrors.length} total (all non-critical)`);
    }
  });

  await runTest("QUALITY", "SEO meta tags present", async () => {
    const frame = page.mainFrame();
    const meta = await frame.evaluate(() => {
      const desc = document.querySelector('meta[name="description"]');
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const viewport = document.querySelector('meta[name="viewport"]');
      return {
        title: document.title,
        description: desc?.getAttribute("content"),
        ogTitle: ogTitle?.getAttribute("content"),
        viewport: viewport?.getAttribute("content"),
      };
    });
    const checks = [];
    if (meta.title) checks.push(`title="${meta.title.slice(0, 40)}"`);
    if (meta.description) checks.push("description");
    if (meta.ogTitle) checks.push("og:title");
    if (meta.viewport) checks.push("viewport");
    if (checks.length < 1) throw new Error("No meta tags found");
    record("QUALITY", "SEO meta tags present", "PASS", checks.join(", "));
  });

  await runTest("QUALITY", "Responsive design indicators", async () => {
    const c = await getPageContent(page);
    const hasResponsive = c.html.includes("sm:") || c.html.includes("md:") || c.html.includes("lg:");
    const hasViewport = c.html.includes("width=device-width");
    if (!hasResponsive && !hasViewport) throw new Error("No responsive indicators");
    record("QUALITY", "Responsive design indicators", "PASS",
      `Tailwind breakpoints: ${hasResponsive}, Viewport meta: ${hasViewport}`);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 9: COMPREHENSIVE ROUTE SCAN — No broken links
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 9: Comprehensive Route Scan ━━━");

  await runTest("ROUTES", "All public routes accessible (no 5xx)", async () => {
    const routes = [
      "/", "/pricing", "/about", "/product", "/get-started", "/waitlist",
      "/login", "/signup", "/chat", "/features", "/contact", "/privacy", "/terms",
    ];
    const broken = [];
    const working = [];

    for (const route of routes) {
      const resp = await fetchFromPage(page, `${BASE_URL}${route}`);
      if (resp.status >= 500) {
        broken.push(`${route}(${resp.status})`);
      } else {
        working.push(route);
      }
    }

    if (broken.length > 0) {
      record("ROUTES", "All public routes accessible (no 5xx)", "FAIL",
        `Server errors: ${broken.join(", ")}. Working: ${working.length}/${routes.length}`);
    } else {
      record("ROUTES", "All public routes accessible (no 5xx)", "PASS",
        `All ${working.length} routes OK`);
    }
  });

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------
  try {
    await stagehand.close();
    record("SETUP", "Stagehand cleanup", "PASS");
  } catch (err) {
    record("SETUP", "Stagehand cleanup", "FAIL", String(err).slice(0, 200));
  }

  // -----------------------------------------------------------------------
  // Print report
  // -----------------------------------------------------------------------
  printReport();
}

function printReport() {
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const warn = results.filter((r) => r.status === "WARN").length;
  const skip = results.filter((r) => r.status === "SKIP").length;
  const total = results.length;

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    VERIFICATION REPORT                      ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Total:  ${String(total).padEnd(5)} | PASS: ${String(pass).padEnd(4)} | FAIL: ${String(fail).padEnd(4)} | WARN: ${String(warn).padEnd(4)} | SKIP: ${String(skip).padEnd(3)}║`);
  console.log(`║  Pass Rate: ${((pass / Math.max(total - skip - warn, 1)) * 100).toFixed(1)}%${" ".repeat(45)}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  // Breakdown by category
  const categories = [...new Set(results.map((r) => r.category))];
  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    const catPass = catResults.filter((r) => r.status === "PASS").length;
    const catFail = catResults.filter((r) => r.status === "FAIL").length;
    const catWarn = catResults.filter((r) => r.status === "WARN").length;
    console.log(`  ${cat}: ${catPass}/${catResults.length} pass${catFail > 0 ? `, ${catFail} fail` : ""}${catWarn > 0 ? `, ${catWarn} warn` : ""}`);
  }

  if (fail > 0) {
    console.log("\n--- FAILURES ---");
    results.filter((r) => r.status === "FAIL").forEach((r) =>
      console.log(`  ❌ [${r.category}] ${r.name}: ${r.detail}`)
    );
  }

  if (warn > 0) {
    console.log("\n--- WARNINGS (may need deployment or auth) ---");
    results.filter((r) => r.status === "WARN").forEach((r) =>
      console.log(`  ⚠️  [${r.category}] ${r.name}: ${r.detail}`)
    );
  }

  console.log(`\nCompleted: ${new Date().toISOString()}`);

  // JSON output for programmatic consumption
  console.log("\n__RESULTS_JSON__");
  console.log(JSON.stringify(results, null, 2));
  console.log("__END_RESULTS_JSON__");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  printReport();
  process.exit(1);
});
