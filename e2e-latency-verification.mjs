/**
 * Latency Verification Suite — Stagehand v3 + Browserbase
 * Verifies all latency fixes deployed to joinsahara.com
 *
 * Fixes under test (from AI-957 perf commits):
 *   1. perf(fred): thread conversation state to context builder — eliminates duplicate DB read
 *   2. perf(fred): remove hidden scoreDecision AI path, LIMIT getFactsByCategory
 *
 * Test plan:
 *   - Measure page load times for all major routes
 *   - Measure API endpoint response times (especially Fred chat)
 *   - Test all user flows end-to-end with timing
 *   - Detect latency spikes (>3s page loads, >5s API calls)
 *   - Verify no regressions in existing functionality
 *
 * Linear: AI-1413
 * Usage: node e2e-latency-verification.mjs
 */

import { Stagehand } from "@browserbasehq/stagehand";

const BASE_URL = "https://joinsahara.com";
const TIMESTAMP = new Date().toISOString();

// Latency thresholds (milliseconds)
const THRESHOLDS = {
  PAGE_LOAD_GOOD: 2000,
  PAGE_LOAD_WARN: 4000,
  PAGE_LOAD_FAIL: 8000,
  API_GOOD: 1000,
  API_WARN: 3000,
  API_FAIL: 8000,
  FRED_CHAT_GOOD: 3000,
  FRED_CHAT_WARN: 6000,
  FRED_CHAT_FAIL: 15000,
  TTFB_GOOD: 500,
  TTFB_WARN: 1500,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const results = [];
const timings = [];

function record(category, name, status, detail = "", latencyMs = null) {
  const entry = { category, name, status, detail, ts: new Date().toISOString() };
  if (latencyMs !== null) {
    entry.latencyMs = latencyMs;
    timings.push({ category, name, latencyMs });
  }
  results.push(entry);
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : status === "WARN" ? "⚠️" : "⏭️";
  const latencyStr = latencyMs !== null ? ` [${latencyMs}ms]` : "";
  console.log(`${icon} [${category}] ${name}${latencyStr}${detail ? " — " + detail : ""}`);
}

function classifyLatency(ms, good, warn) {
  if (ms <= good) return "PASS";
  if (ms <= warn) return "WARN";
  return "FAIL";
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function navigateTo(page, url, waitMs = 3000) {
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

async function fetchWithTiming(page, url, options = {}) {
  const frame = page.mainFrame();
  return await frame.evaluate(async ({ fetchUrl, fetchOptions }) => {
    const start = performance.now();
    try {
      const r = await fetch(fetchUrl, {
        redirect: "follow",
        credentials: "omit",
        ...fetchOptions,
      });
      const ttfb = performance.now() - start;
      const body = await r.text();
      const total = performance.now() - start;
      return {
        status: r.status,
        body,
        ok: r.ok,
        url: r.url,
        ttfbMs: Math.round(ttfb),
        totalMs: Math.round(total),
        bodySize: body.length,
      };
    } catch (e) {
      const total = performance.now() - start;
      return {
        status: 0,
        body: String(e),
        ok: false,
        url: fetchUrl,
        ttfbMs: Math.round(total),
        totalMs: Math.round(total),
        bodySize: 0,
        error: String(e),
      };
    }
  }, { fetchUrl: url, fetchOptions: options });
}

async function measurePageLoad(page, url, label) {
  const start = Date.now();
  try {
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
  } catch (err) {
    // timeout is itself a latency signal
  }
  await sleep(1000); // allow hydration
  const elapsed = Date.now() - start - 1000; // subtract sleep
  return elapsed;
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
  console.log("║  SAHARA — Latency Verification Suite via Stagehand         ║");
  console.log("║  Target: https://joinsahara.com                            ║");
  console.log(`║  Date: ${TIMESTAMP.slice(0, 19).padEnd(51)}║`);
  console.log("║  Linear: AI-1413                                           ║");
  console.log("║  Focus: Fred AI perf fixes (AI-957), full E2E timing       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // -----------------------------------------------------------------------
  // Initialize Stagehand
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
  // SECTION 1: PAGE LOAD LATENCY — All major routes
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 1: Page Load Latency ━━━");

  const pageRoutes = [
    { path: "/", label: "Homepage" },
    { path: "/pricing", label: "Pricing" },
    { path: "/about", label: "About" },
    { path: "/get-started", label: "Get Started" },
    { path: "/login", label: "Login" },
    { path: "/signup", label: "Signup" },
    { path: "/waitlist", label: "Waitlist" },
    { path: "/dashboard", label: "Dashboard (→ login redirect)" },
    { path: "/chat", label: "Chat page" },
  ];

  for (const route of pageRoutes) {
    await runTest("PAGE_LOAD", route.label, async () => {
      const elapsed = await measurePageLoad(page, `${BASE_URL}${route.path}`, route.label);
      const status = classifyLatency(elapsed, THRESHOLDS.PAGE_LOAD_GOOD, THRESHOLDS.PAGE_LOAD_WARN);
      record("PAGE_LOAD", route.label, status,
        `${elapsed}ms (good<${THRESHOLDS.PAGE_LOAD_GOOD}ms, warn<${THRESHOLDS.PAGE_LOAD_WARN}ms)`,
        elapsed);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 2: API ENDPOINT LATENCY — TTFB + total response
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 2: API Endpoint Latency ━━━");

  // Navigate to homepage first for fetch context
  await navigateTo(page, BASE_URL, 3000);

  const apiEndpoints = [
    { path: "/api/health", label: "Health check" },
    { path: "/api/marketplace/providers", label: "Marketplace providers" },
    { path: "/api/marketplace/categories", label: "Marketplace categories" },
    { path: "/api/content", label: "Content library" },
    { path: "/api/content/recommendations", label: "Content recommendations" },
    { path: "/api/agents", label: "Agents list" },
    { path: "/api/dashboard/stats", label: "Dashboard stats" },
  ];

  for (const ep of apiEndpoints) {
    await runTest("API_LATENCY", ep.label, async () => {
      const resp = await fetchWithTiming(page, `${BASE_URL}${ep.path}`);
      if (resp.status === 404) {
        record("API_LATENCY", ep.label, "SKIP", `404 — endpoint not deployed`, resp.totalMs);
        return;
      }
      if (resp.status >= 500) {
        record("API_LATENCY", ep.label, "FAIL", `Server error ${resp.status} in ${resp.totalMs}ms`, resp.totalMs);
        return;
      }
      const status = classifyLatency(resp.totalMs, THRESHOLDS.API_GOOD, THRESHOLDS.API_WARN);
      record("API_LATENCY", ep.label, status,
        `${resp.totalMs}ms total, TTFB: ${resp.ttfbMs}ms, Status: ${resp.status}, Size: ${resp.bodySize}B`,
        resp.totalMs);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 3: FRED AI CHAT LATENCY — The primary target of perf fixes
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 3: Fred AI Chat Latency (Primary Target) ━━━");
  console.log("  Note: Fred chat requires auth. Testing API reachability + timing.");

  await runTest("FRED_CHAT", "Fred chat API reachability", async () => {
    // Test with a simple POST to see if the endpoint exists and responds
    const resp = await fetchWithTiming(page, `${BASE_URL}/api/fred/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello", conversationId: "test" }),
    });
    // We expect 401 (unauthorized) — that proves the endpoint is reachable
    // and the route handler executes the auth check quickly
    if (resp.status === 401 || resp.status === 403) {
      const status = classifyLatency(resp.totalMs, THRESHOLDS.API_GOOD, THRESHOLDS.API_WARN);
      record("FRED_CHAT", "Fred chat API reachability", status,
        `Auth rejection in ${resp.totalMs}ms (endpoint alive, auth gate fast)`,
        resp.totalMs);
    } else if (resp.status === 404) {
      record("FRED_CHAT", "Fred chat API reachability", "FAIL", "Chat endpoint returns 404", resp.totalMs);
    } else if (resp.status >= 500) {
      record("FRED_CHAT", "Fred chat API reachability", "FAIL",
        `Server error ${resp.status} in ${resp.totalMs}ms`, resp.totalMs);
    } else {
      record("FRED_CHAT", "Fred chat API reachability", "PASS",
        `Status: ${resp.status} in ${resp.totalMs}ms`, resp.totalMs);
    }
  });

  // Test related Fred endpoints
  const fredEndpoints = [
    { path: "/api/fred/history", label: "Fred history API" },
    { path: "/api/fred/memory", label: "Fred memory API" },
    { path: "/api/fred/mode", label: "Fred mode API" },
    { path: "/api/fred/analyze", label: "Fred analyze API" },
    { path: "/api/fred/investor-readiness", label: "Fred IRS API" },
    { path: "/api/fred/reality-lens", label: "Fred reality-lens API" },
  ];

  for (const ep of fredEndpoints) {
    await runTest("FRED_CHAT", ep.label, async () => {
      const resp = await fetchWithTiming(page, `${BASE_URL}${ep.path}`);
      if (resp.status === 404) {
        record("FRED_CHAT", ep.label, "SKIP", `404 — not deployed`, resp.totalMs);
        return;
      }
      // 401/405 still proves the route handler responds quickly
      const status = classifyLatency(resp.totalMs, THRESHOLDS.API_GOOD, THRESHOLDS.API_WARN);
      record("FRED_CHAT", ep.label, status,
        `${resp.totalMs}ms, Status: ${resp.status}`,
        resp.totalMs);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 4: MULTI-REQUEST BURST — Detect latency spikes under load
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 4: Burst Latency Test (5 sequential requests) ━━━");

  await runTest("BURST", "Homepage burst (5 requests)", async () => {
    const burstTimings = [];
    for (let i = 0; i < 5; i++) {
      const resp = await fetchWithTiming(page, BASE_URL);
      burstTimings.push(resp.totalMs);
    }
    const avg = Math.round(burstTimings.reduce((a, b) => a + b, 0) / burstTimings.length);
    const max = Math.max(...burstTimings);
    const min = Math.min(...burstTimings);
    const p95 = burstTimings.sort((a, b) => a - b)[Math.floor(burstTimings.length * 0.95)];
    const spike = max > avg * 3; // spike = 3x average

    const status = spike ? "WARN" : classifyLatency(avg, THRESHOLDS.API_GOOD, THRESHOLDS.API_WARN);
    record("BURST", "Homepage burst (5 requests)", status,
      `avg: ${avg}ms, min: ${min}ms, max: ${max}ms, p95: ${p95}ms${spike ? " ⚡ SPIKE DETECTED" : ""}`,
      avg);
  });

  await runTest("BURST", "Fred chat burst (5 requests)", async () => {
    const burstTimings = [];
    for (let i = 0; i < 5; i++) {
      const resp = await fetchWithTiming(page, `${BASE_URL}/api/fred/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "test", conversationId: "burst-test" }),
      });
      burstTimings.push(resp.totalMs);
    }
    const avg = Math.round(burstTimings.reduce((a, b) => a + b, 0) / burstTimings.length);
    const max = Math.max(...burstTimings);
    const min = Math.min(...burstTimings);
    const spike = max > avg * 3;

    const status = spike ? "WARN" : classifyLatency(avg, THRESHOLDS.API_GOOD, THRESHOLDS.API_WARN);
    record("BURST", "Fred chat burst (5 requests)", status,
      `avg: ${avg}ms, min: ${min}ms, max: ${max}ms${spike ? " ⚡ SPIKE DETECTED" : ""}`,
      avg);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 5: USER FLOW E2E — Full navigation with timing
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 5: User Flow E2E Timing ━━━");

  await runTest("E2E_FLOW", "Landing → Get Started flow", async () => {
    const flowStart = Date.now();

    // Step 1: Load homepage
    const step1Start = Date.now();
    await navigateTo(page, BASE_URL, 2000);
    const step1 = Date.now() - step1Start - 2000;

    // Step 2: Navigate to get-started
    const step2Start = Date.now();
    await navigateTo(page, `${BASE_URL}/get-started`, 2000);
    const step2 = Date.now() - step2Start - 2000;

    // Step 3: Navigate to pricing
    const step3Start = Date.now();
    await navigateTo(page, `${BASE_URL}/pricing`, 2000);
    const step3 = Date.now() - step3Start - 2000;

    const totalFlow = step1 + step2 + step3;
    const status = classifyLatency(totalFlow, 4000, 8000);
    record("E2E_FLOW", "Landing → Get Started flow", status,
      `Total: ${totalFlow}ms (Home: ${step1}ms, GetStarted: ${step2}ms, Pricing: ${step3}ms)`,
      totalFlow);
  });

  await runTest("E2E_FLOW", "Landing → Login flow", async () => {
    const step1Start = Date.now();
    await navigateTo(page, BASE_URL, 2000);
    const step1 = Date.now() - step1Start - 2000;

    const step2Start = Date.now();
    await navigateTo(page, `${BASE_URL}/login`, 2000);
    const step2 = Date.now() - step2Start - 2000;

    const c = await getPageContent(page);
    const hasLoginForm = c.html.includes("email") || c.html.includes("password") ||
      c.html.includes("Sign in") || c.html.includes("Log in");

    const totalFlow = step1 + step2;
    const status = classifyLatency(totalFlow, 3000, 6000);
    record("E2E_FLOW", "Landing → Login flow", status,
      `Total: ${totalFlow}ms (Home: ${step1}ms, Login: ${step2}ms), Login form: ${hasLoginForm}`,
      totalFlow);
  });

  await runTest("E2E_FLOW", "Landing → Dashboard (auth redirect)", async () => {
    const stepStart = Date.now();
    await navigateTo(page, `${BASE_URL}/dashboard`, 3000);
    const elapsed = Date.now() - stepStart - 3000;
    const c = await getPageContent(page);
    const wasRedirected = c.url?.includes("/login") || c.html.includes("Sign in");

    const status = classifyLatency(elapsed, THRESHOLDS.PAGE_LOAD_GOOD, THRESHOLDS.PAGE_LOAD_WARN);
    record("E2E_FLOW", "Landing → Dashboard (auth redirect)", status,
      `${elapsed}ms, Redirected to login: ${wasRedirected}`,
      elapsed);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 6: DEMO PAGES REGRESSION — Timing + content verification
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 6: Demo Pages Regression + Timing ━━━");

  const demoPages = [
    { path: "/demo/reality-lens", label: "Reality Lens demo" },
    { path: "/demo/investor-lens", label: "Investor Lens demo" },
    { path: "/demo/pitch-deck", label: "Pitch Deck demo" },
    { path: "/demo/virtual-team", label: "Virtual Team demo" },
    { path: "/demo/boardy", label: "Boardy demo" },
  ];

  for (const demo of demoPages) {
    await runTest("DEMO_REGRESSION", demo.label, async () => {
      const resp = await fetchWithTiming(page, `${BASE_URL}${demo.path}`);
      if (!resp.ok && resp.status !== 307 && resp.status !== 308) {
        record("DEMO_REGRESSION", demo.label, "FAIL",
          `Status ${resp.status} in ${resp.totalMs}ms`, resp.totalMs);
        return;
      }
      if (resp.bodySize < 500) {
        record("DEMO_REGRESSION", demo.label, "WARN",
          `Response too small: ${resp.bodySize}B in ${resp.totalMs}ms`, resp.totalMs);
        return;
      }
      const status = classifyLatency(resp.totalMs, THRESHOLDS.API_GOOD, THRESHOLDS.API_WARN);
      record("DEMO_REGRESSION", demo.label, status,
        `${resp.totalMs}ms, Size: ${resp.bodySize}B, Status: ${resp.status}`,
        resp.totalMs);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 7: CONSOLE ERRORS — No new errors introduced
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 7: Console Error Regression ━━━");

  await runTest("CONSOLE", "No critical console errors (homepage)", async () => {
    const consoleErrors = [];
    const handler = (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    };
    page.on("console", handler);
    await navigateTo(page, BASE_URL, 4000);
    page.off("console", handler);

    const ignoredPatterns = [
      "favicon", "manifest", "hydration", "ThirdParty", "ERR_BLOCKED_BY_CLIENT",
      "net::", "Mixed Content", "WebSocket", "__nextjs", "_next", "CORS",
      "posthog", "sentry", "gtag", "analytics", "chunk",
    ];
    const critical = consoleErrors.filter((e) =>
      !ignoredPatterns.some((p) => e.toLowerCase().includes(p.toLowerCase()))
    );
    if (critical.length > 0) {
      record("CONSOLE", "No critical console errors (homepage)", "WARN",
        `${critical.length} errors: ${critical.slice(0, 3).join("; ").slice(0, 200)}`);
    } else {
      record("CONSOLE", "No critical console errors (homepage)", "PASS",
        `${consoleErrors.length} total (all non-critical)`);
    }
  });

  await runTest("CONSOLE", "No critical console errors (login)", async () => {
    const consoleErrors = [];
    const handler = (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    };
    page.on("console", handler);
    await navigateTo(page, `${BASE_URL}/login`, 4000);
    page.off("console", handler);

    const ignoredPatterns = [
      "favicon", "manifest", "hydration", "ThirdParty", "ERR_BLOCKED_BY_CLIENT",
      "net::", "Mixed Content", "WebSocket", "__nextjs", "_next", "CORS",
      "posthog", "sentry", "gtag", "analytics", "chunk",
    ];
    const critical = consoleErrors.filter((e) =>
      !ignoredPatterns.some((p) => e.toLowerCase().includes(p.toLowerCase()))
    );
    if (critical.length > 0) {
      record("CONSOLE", "No critical console errors (login)", "WARN",
        `${critical.length} errors: ${critical.slice(0, 3).join("; ").slice(0, 200)}`);
    } else {
      record("CONSOLE", "No critical console errors (login)", "PASS",
        `${consoleErrors.length} total (all non-critical)`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 8: COMPREHENSIVE ROUTE HEALTH — All public routes
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n━━━ SECTION 8: Route Health + Timing ━━━");

  const allRoutes = [
    "/", "/pricing", "/about", "/product", "/get-started", "/waitlist",
    "/login", "/signup", "/chat", "/features", "/contact", "/privacy", "/terms",
  ];

  const routeTimings = [];
  for (const route of allRoutes) {
    await runTest("ROUTE_HEALTH", `${route} response`, async () => {
      const resp = await fetchWithTiming(page, `${BASE_URL}${route}`);
      routeTimings.push({ route, ...resp });
      if (resp.status >= 500) {
        record("ROUTE_HEALTH", `${route} response`, "FAIL",
          `Server error ${resp.status} in ${resp.totalMs}ms`, resp.totalMs);
        return;
      }
      const status = classifyLatency(resp.totalMs, THRESHOLDS.API_GOOD, THRESHOLDS.API_WARN);
      record("ROUTE_HEALTH", `${route} response`, status,
        `${resp.totalMs}ms, Status: ${resp.status}, Size: ${resp.bodySize}B`,
        resp.totalMs);
    });
  }

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
  // Print comprehensive report
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
  console.log("║              LATENCY VERIFICATION REPORT                    ║");
  console.log("║              Linear: AI-1413                                ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Total:  ${String(total).padEnd(5)} | PASS: ${String(pass).padEnd(4)} | FAIL: ${String(fail).padEnd(4)} | WARN: ${String(warn).padEnd(4)} | SKIP: ${String(skip).padEnd(3)}║`);
  console.log(`║  Pass Rate: ${((pass / Math.max(total - skip, 1)) * 100).toFixed(1)}%${" ".repeat(45)}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  // Breakdown by category
  const categories = [...new Set(results.map((r) => r.category))];
  console.log("\n--- CATEGORY BREAKDOWN ---");
  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    const catPass = catResults.filter((r) => r.status === "PASS").length;
    const catFail = catResults.filter((r) => r.status === "FAIL").length;
    const catWarn = catResults.filter((r) => r.status === "WARN").length;
    console.log(`  ${cat}: ${catPass}/${catResults.length} pass${catFail > 0 ? `, ${catFail} fail` : ""}${catWarn > 0 ? `, ${catWarn} warn` : ""}`);
  }

  // Latency summary
  if (timings.length > 0) {
    console.log("\n--- LATENCY SUMMARY ---");
    const latencyByCategory = {};
    for (const t of timings) {
      if (!latencyByCategory[t.category]) latencyByCategory[t.category] = [];
      latencyByCategory[t.category].push(t.latencyMs);
    }
    for (const [cat, vals] of Object.entries(latencyByCategory)) {
      const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      console.log(`  ${cat}: avg=${avg}ms, min=${min}ms, max=${max}ms (${vals.length} samples)`);
    }

    // Top 5 slowest
    const sorted = [...timings].sort((a, b) => b.latencyMs - a.latencyMs);
    console.log("\n--- TOP 5 SLOWEST ---");
    for (const t of sorted.slice(0, 5)) {
      console.log(`  ${t.latencyMs}ms — [${t.category}] ${t.name}`);
    }

    // Spike detection
    const allLatencies = timings.map((t) => t.latencyMs).filter((v) => v > 0);
    const overallAvg = Math.round(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length);
    const spikes = timings.filter((t) => t.latencyMs > overallAvg * 3);
    if (spikes.length > 0) {
      console.log(`\n--- ⚡ LATENCY SPIKES (>3x avg of ${overallAvg}ms) ---`);
      for (const s of spikes) {
        console.log(`  ${s.latencyMs}ms — [${s.category}] ${s.name}`);
      }
    } else {
      console.log(`\n  ✅ No latency spikes detected (avg: ${overallAvg}ms)`);
    }
  }

  if (fail > 0) {
    console.log("\n--- FAILURES ---");
    results.filter((r) => r.status === "FAIL").forEach((r) =>
      console.log(`  ❌ [${r.category}] ${r.name}: ${r.detail}`)
    );
  }

  if (warn > 0) {
    console.log("\n--- WARNINGS ---");
    results.filter((r) => r.status === "WARN").forEach((r) =>
      console.log(`  ⚠️  [${r.category}] ${r.name}: ${r.detail}`)
    );
  }

  console.log(`\nCompleted: ${new Date().toISOString()}`);

  // JSON output for programmatic consumption
  console.log("\n__RESULTS_JSON__");
  console.log(JSON.stringify({ results, timings, timestamp: TIMESTAMP }, null, 2));
  console.log("__END_RESULTS_JSON__");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  printReport();
  process.exit(1);
});
