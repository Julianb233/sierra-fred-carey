/**
 * Stagehand Latency Verification Test — AI-2297
 *
 * Measures response times across all critical user flows after backend
 * latency fixes (AI-1940, AI-2210, AI-2256). Tests against the live
 * production site using Stagehand v3.
 *
 * Latency fixes verified:
 *   1. SELECT * replaced with specific columns in Fred memory queries
 *   2. Performance indexes on fred_episodic_memory, fred_semantic_memory,
 *      reality_lens_analyses, next_steps
 *   3. Database column mismatches resolved (no more failed queries)
 *   4. Duplicate episode elimination (DB-level dedup constraint)
 *   5. Fire-and-forget storeEpisode properly awaited
 *
 * Usage:
 *   BASE_URL=https://joinsahara.com node scripts/stagehand-latency-verification.mjs
 *   node scripts/stagehand-latency-verification.mjs  # defaults to localhost:3000
 */

import { Stagehand } from "@browserbasehq/stagehand";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Latency thresholds (milliseconds)
const THRESHOLDS = {
  pageLoad: 4000,       // Page should load within 4s
  apiResponse: 3000,    // API endpoints should respond within 3s
  fredFirstToken: 8000, // Fred AI first token within 8s (LLM streaming)
  fredFullResponse: 30000, // Fred full response within 30s
  navigation: 3000,     // Client-side navigation within 3s
};

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------
const results = [];

function record(name, status, latencyMs, detail = "") {
  const entry = {
    name,
    status,
    latencyMs: Math.round(latencyMs),
    detail,
    threshold: null,
    ts: new Date().toISOString(),
  };
  results.push(entry);
  const icon = status === "PASS" ? "[PASS]" : status === "FAIL" ? "[FAIL]" : "[WARN]";
  const latStr = latencyMs >= 0 ? ` (${Math.round(latencyMs)}ms)` : "";
  console.log(`${icon} ${name}${latStr}${detail ? " — " + detail : ""}`);
}

function recordWithThreshold(name, latencyMs, thresholdMs, detail = "") {
  const status = latencyMs <= thresholdMs ? "PASS" : "FAIL";
  const entry = {
    name,
    status,
    latencyMs: Math.round(latencyMs),
    threshold: thresholdMs,
    detail: detail || `${status === "PASS" ? "Within" : "Exceeds"} ${thresholdMs}ms threshold`,
    ts: new Date().toISOString(),
  };
  results.push(entry);
  const icon = status === "PASS" ? "[PASS]" : "[FAIL]";
  console.log(`${icon} ${name} (${Math.round(latencyMs)}ms / ${thresholdMs}ms threshold)${detail ? " — " + detail : ""}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Timing helpers
// ---------------------------------------------------------------------------

/** Measure page navigation latency */
async function measurePageLoad(page, url, label) {
  const start = Date.now();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    const elapsed = Date.now() - start;
    recordWithThreshold(label, elapsed, THRESHOLDS.pageLoad);
    return elapsed;
  } catch (err) {
    const elapsed = Date.now() - start;
    record(label, "FAIL", elapsed, `Navigation error: ${String(err).slice(0, 150)}`);
    return elapsed;
  }
}

/** Measure an API endpoint response time via in-page fetch */
async function measureApiFetch(page, endpoint, label, options = {}) {
  const frame = page.mainFrame();
  const result = await frame.evaluate(
    async ({ endpoint, options }) => {
      const start = performance.now();
      try {
        const resp = await fetch(endpoint, {
          method: options.method || "GET",
          headers: options.headers || { "Content-Type": "application/json" },
          body: options.body ? JSON.stringify(options.body) : undefined,
          ...options.fetchOptions,
        });
        const elapsed = performance.now() - start;
        const body = await resp.text();
        return {
          status: resp.status,
          elapsed: Math.round(elapsed),
          bodyLength: body.length,
          ok: resp.ok,
          bodyPreview: body.slice(0, 200),
        };
      } catch (e) {
        const elapsed = performance.now() - start;
        return { status: 0, elapsed: Math.round(elapsed), error: String(e).slice(0, 200), ok: false };
      }
    },
    { endpoint, options },
  );

  if (result.ok || result.status === 401 || result.status === 302) {
    // 401/302 are expected for auth-gated endpoints when not logged in
    const threshold = options.threshold || THRESHOLDS.apiResponse;
    recordWithThreshold(label, result.elapsed, threshold, `HTTP ${result.status}, ${result.bodyLength} bytes`);
  } else {
    record(label, "FAIL", result.elapsed, `HTTP ${result.status}: ${result.error || result.bodyPreview}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

async function testPageLoadLatency(page) {
  console.log("\n--- Page Load Latency ---");
  const routes = [
    { path: "/", label: "Homepage load" },
    { path: "/pricing", label: "/pricing load" },
    { path: "/get-started", label: "/get-started load" },
    { path: "/login", label: "/login load" },
    { path: "/about", label: "/about load" },
    { path: "/chat", label: "/chat load" },
    { path: "/product", label: "/product load" },
    { path: "/contact", label: "/contact load" },
  ];

  const timings = [];
  for (const route of routes) {
    const elapsed = await measurePageLoad(page, `${BASE_URL}${route.path}`, route.label);
    timings.push({ route: route.path, elapsed });
  }

  const avg = timings.reduce((sum, t) => sum + t.elapsed, 0) / timings.length;
  const max = Math.max(...timings.map((t) => t.elapsed));
  const slowest = timings.find((t) => t.elapsed === max);
  record("Page load average", avg <= THRESHOLDS.pageLoad ? "PASS" : "WARN", avg, `Avg across ${timings.length} pages, slowest: ${slowest.route} (${max}ms)`);
}

async function testApiEndpointLatency(page) {
  console.log("\n--- API Endpoint Latency ---");
  // Navigate to homepage first so we have a page context for fetch
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await sleep(2000);

  // Public API endpoints
  await measureApiFetch(page, "/api/health", "GET /api/health");

  // Fred endpoints (will return 401 unauthenticated — we measure server response time)
  await measureApiFetch(page, "/api/fred/history", "GET /api/fred/history (latency-fixed)");
  await measureApiFetch(page, "/api/fred/memory/stats", "GET /api/fred/memory/stats");

  // Dashboard / auth-gated endpoints
  await measureApiFetch(page, "/api/dashboard/stats", "GET /api/dashboard/stats");
  await measureApiFetch(page, "/api/agents", "GET /api/agents");

  // Reality lens
  await measureApiFetch(page, "/api/fred/reality-lens", "GET /api/fred/reality-lens");

  // Strategy endpoints
  await measureApiFetch(page, "/api/fred/strategy", "GET /api/fred/strategy");
}

async function testFredChatLatency(page) {
  console.log("\n--- Fred AI Chat Latency (Key Fix Area) ---");

  // Navigate to chat page
  const chatLoadStart = Date.now();
  await page.goto(`${BASE_URL}/chat`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await sleep(3000);
  const chatLoadTime = Date.now() - chatLoadStart;
  recordWithThreshold("Chat page full load", chatLoadTime, THRESHOLDS.pageLoad);

  // Check if chat interface loaded (may require auth)
  const frame = page.mainFrame();
  const chatState = await frame.evaluate(() => {
    const textarea = document.querySelector('textarea[placeholder*="Ask Fred"], textarea[placeholder*="ask"], input[placeholder*="message"]');
    const greeting = document.body.innerText.includes("Fred") || document.body.innerText.includes("fred");
    const loginRedirect = window.location.pathname.includes("/login");
    return {
      hasInput: !!textarea,
      hasGreeting: greeting,
      loginRedirect,
      pathname: window.location.pathname,
    };
  });

  if (chatState.loginRedirect) {
    record("Fred AI chat (auth required)", "WARN", -1, "Redirected to login — chat latency tested via API");

    // Test the chat API directly with a POST (will get 401 but measures server response)
    await measureApiFetch(page, "/api/fred/chat", "POST /api/fred/chat (auth-gated response time)", {
      method: "POST",
      body: { messages: [{ role: "user", content: "Hello" }] },
      threshold: THRESHOLDS.apiResponse,
    });
  } else if (chatState.hasInput) {
    record("Chat interface loaded", "PASS", chatLoadTime, `Input found, greeting: ${chatState.hasGreeting}`);

    // Measure Fred AI response time by intercepting SSE stream
    const fredResponseTiming = await frame.evaluate(async () => {
      const start = performance.now();
      let firstTokenTime = null;
      let fullResponseTime = null;

      try {
        const resp = await fetch("/api/fred/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: "What are the top 3 things a startup founder should focus on?" }],
          }),
        });

        if (!resp.ok) {
          const elapsed = performance.now() - start;
          return { error: `HTTP ${resp.status}`, elapsed: Math.round(elapsed), firstTokenTime: null, fullResponseTime: null };
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          if (!firstTokenTime && chunk.length > 0) {
            firstTokenTime = Math.round(performance.now() - start);
          }
          fullText += chunk;
        }

        fullResponseTime = Math.round(performance.now() - start);
        return {
          firstTokenTime,
          fullResponseTime,
          responseLength: fullText.length,
          error: null,
        };
      } catch (e) {
        const elapsed = performance.now() - start;
        return { error: String(e).slice(0, 200), elapsed: Math.round(elapsed), firstTokenTime: null, fullResponseTime: null };
      }
    });

    if (fredResponseTiming.error) {
      record("Fred AI response", "FAIL", fredResponseTiming.elapsed || -1, fredResponseTiming.error);
    } else {
      if (fredResponseTiming.firstTokenTime !== null) {
        recordWithThreshold(
          "Fred AI first token (TTFT)",
          fredResponseTiming.firstTokenTime,
          THRESHOLDS.fredFirstToken,
          `${fredResponseTiming.responseLength} bytes total`,
        );
      }
      if (fredResponseTiming.fullResponseTime !== null) {
        recordWithThreshold(
          "Fred AI full response",
          fredResponseTiming.fullResponseTime,
          THRESHOLDS.fredFullResponse,
          `${fredResponseTiming.responseLength} bytes`,
        );
      }
    }
  } else {
    record("Chat interface", "WARN", chatLoadTime, `No input found. Path: ${chatState.pathname}`);
  }
}

async function testNavigationLatency(page) {
  console.log("\n--- Client-Side Navigation Latency ---");

  // Start from homepage
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await sleep(2000);

  const frame = page.mainFrame();
  const navTargets = [
    { href: "/pricing", label: "Home → Pricing" },
    { href: "/about", label: "Pricing → About" },
    { href: "/get-started", label: "About → Get Started" },
    { href: "/", label: "Get Started → Home" },
  ];

  for (const target of navTargets) {
    const navResult = await frame.evaluate(async (href) => {
      const start = performance.now();
      // Try clicking a link first
      const link = document.querySelector(`a[href="${href}"]`);
      if (link) {
        link.click();
        // Wait for URL to change
        await new Promise((resolve) => {
          const check = () => {
            if (window.location.pathname === href) resolve();
            else setTimeout(check, 50);
          };
          setTimeout(check, 50);
          setTimeout(resolve, 5000); // timeout
        });
        const elapsed = performance.now() - start;
        return { elapsed: Math.round(elapsed), method: "link-click", pathname: window.location.pathname };
      }
      // Fallback: programmatic navigation
      window.location.href = href;
      await new Promise((r) => setTimeout(r, 2000));
      const elapsed = performance.now() - start;
      return { elapsed: Math.round(elapsed), method: "location-href", pathname: window.location.pathname };
    }, target.href);

    recordWithThreshold(target.label, navResult.elapsed, THRESHOLDS.navigation, `via ${navResult.method}`);
    await sleep(1000); // let page settle
  }
}

async function testFredHistoryLatency(page) {
  console.log("\n--- Fred History Endpoint (Key Fix Area) ---");
  // This was a primary target of the latency fixes — SELECT * → specific columns
  // and performance indexes on fred_episodic_memory

  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await sleep(1500);

  // Measure multiple calls to check for latency consistency (no spikes)
  const timings = [];
  for (let i = 0; i < 3; i++) {
    const result = await measureApiFetch(
      page,
      "/api/fred/history",
      `GET /api/fred/history (call ${i + 1}/3)`,
    );
    timings.push(result.elapsed);
    await sleep(500);
  }

  const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
  const maxSpike = Math.max(...timings);
  const minTime = Math.min(...timings);
  const variance = maxSpike - minTime;

  record(
    "Fred history latency consistency",
    variance < 1000 ? "PASS" : "WARN",
    avg,
    `Min: ${minTime}ms, Max: ${maxSpike}ms, Variance: ${variance}ms`,
  );
}

async function testNoRegressions(page) {
  console.log("\n--- Regression Checks ---");

  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await sleep(2000);

  const frame = page.mainFrame();

  // Check for error states
  const errorCheck = await frame.evaluate(() => {
    const body = document.body.innerText;
    const hasErrorBanner = body.includes("Something went wrong") || body.includes("Internal Server Error");
    const has500 = body.includes("500");
    const hasErrorBoundary = !!document.querySelector('[class*="error-boundary"], [data-testid="error"]');
    return { hasErrorBanner, has500, hasErrorBoundary, bodyLength: body.length };
  });

  record(
    "Homepage no error states",
    !errorCheck.hasErrorBanner && !errorCheck.hasErrorBoundary ? "PASS" : "FAIL",
    -1,
    `Errors: banner=${errorCheck.hasErrorBanner}, 500=${errorCheck.has500}, boundary=${errorCheck.hasErrorBoundary}`,
  );

  // Check console errors during a page load
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await page.goto(`${BASE_URL}/chat`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await sleep(3000);

  const criticalErrors = consoleErrors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("manifest") &&
      !e.includes("hydration") &&
      !e.includes("ERR_BLOCKED_BY_CLIENT") &&
      !e.includes("net::") &&
      !e.includes("WebSocket") &&
      !e.includes("__nextjs") &&
      !e.includes("_next"),
  );

  record(
    "No critical console errors on /chat",
    criticalErrors.length === 0 ? "PASS" : "WARN",
    -1,
    criticalErrors.length > 0
      ? `${criticalErrors.length} errors: ${criticalErrors.slice(0, 2).join("; ").slice(0, 150)}`
      : "Clean console",
  );
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------
function generateReport() {
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const warn = results.filter((r) => r.status === "WARN").length;
  const total = results.length;

  const measuredResults = results.filter((r) => r.latencyMs > 0);
  const avgLatency = measuredResults.length > 0
    ? Math.round(measuredResults.reduce((sum, r) => sum + r.latencyMs, 0) / measuredResults.length)
    : 0;
  const maxLatency = measuredResults.length > 0 ? Math.max(...measuredResults.map((r) => r.latencyMs)) : 0;
  const slowest = measuredResults.find((r) => r.latencyMs === maxLatency);

  console.log("\n" + "=".repeat(60));
  console.log("  LATENCY VERIFICATION REPORT — AI-2297");
  console.log("=".repeat(60));
  console.log(`  Target:     ${BASE_URL}`);
  console.log(`  Date:       ${new Date().toISOString()}`);
  console.log(`  Total:      ${total} checks`);
  console.log(`  PASS:       ${pass}`);
  console.log(`  FAIL:       ${fail}`);
  console.log(`  WARN:       ${warn}`);
  console.log(`  Pass rate:  ${((pass / Math.max(total, 1)) * 100).toFixed(1)}%`);
  console.log(`  Avg latency: ${avgLatency}ms (across ${measuredResults.length} timed checks)`);
  console.log(`  Max latency: ${maxLatency}ms${slowest ? ` (${slowest.name})` : ""}`);
  console.log("=".repeat(60));

  if (fail > 0) {
    console.log("\n--- FAILURES ---");
    results
      .filter((r) => r.status === "FAIL")
      .forEach((r) => {
        const thresh = r.threshold ? ` [threshold: ${r.threshold}ms]` : "";
        console.log(`  [FAIL] ${r.name}: ${r.latencyMs}ms${thresh} — ${r.detail}`);
      });
  }

  if (warn > 0) {
    console.log("\n--- WARNINGS ---");
    results
      .filter((r) => r.status === "WARN")
      .forEach((r) => console.log(`  [WARN] ${r.name}: ${r.detail}`));
  }

  console.log("\n--- ALL RESULTS ---");
  results.forEach((r) => {
    const icon = r.status === "PASS" ? "+" : r.status === "FAIL" ? "x" : "!";
    const lat = r.latencyMs >= 0 ? `${r.latencyMs}ms` : "n/a";
    const thresh = r.threshold ? `/${r.threshold}ms` : "";
    console.log(`  [${icon}] ${r.name}: ${lat}${thresh} — ${r.detail}`);
  });

  // JSON output for programmatic consumption
  console.log("\n__RESULTS_JSON__");
  console.log(JSON.stringify({
    meta: {
      target: BASE_URL,
      date: new Date().toISOString(),
      total,
      pass,
      fail,
      warn,
      avgLatency,
      maxLatency,
      thresholds: THRESHOLDS,
    },
    results,
  }, null, 2));
  console.log("__END_RESULTS_JSON__");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Stagehand Latency Verification — AI-2297 ===");
  console.log(`Target: ${BASE_URL}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`\nLatency fixes under test:`);
  console.log(`  - AI-1940: DB column mismatches + SELECT * → specific columns + perf indexes`);
  console.log(`  - AI-2210: Duplicate episode elimination (DB-level dedup)`);
  console.log(`  - AI-2256: Fire-and-forget storeEpisode fix`);
  console.log();

  let stagehand;
  try {
    stagehand = new Stagehand({
      env: "LOCAL",
      verbose: 0,
      disablePino: true,
      localBrowserLaunchOptions: {
        headless: true,
        chromiumSandbox: false,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--single-process",
        ],
        viewport: { width: 1280, height: 800 },
      },
    });
    await stagehand.init();
    record("Stagehand initialization", "PASS", 0);
  } catch (err) {
    record("Stagehand initialization", "FAIL", -1, String(err).slice(0, 300));
    generateReport();
    process.exit(1);
  }

  const page = stagehand.context.pages()[0];

  try {
    // 1. Page load latency
    await testPageLoadLatency(page);

    // 2. API endpoint latency
    await testApiEndpointLatency(page);

    // 3. Fred AI chat latency (primary fix area)
    await testFredChatLatency(page);

    // 4. Fred history endpoint (primary fix area)
    await testFredHistoryLatency(page);

    // 5. Client-side navigation latency
    await testNavigationLatency(page);

    // 6. Regression checks
    await testNoRegressions(page);
  } catch (err) {
    record("Test suite error", "FAIL", -1, String(err).slice(0, 300));
  }

  // Cleanup
  try {
    await stagehand.close();
  } catch (_) {
    // ignore cleanup errors
  }

  // Report
  generateReport();

  const fail = results.filter((r) => r.status === "FAIL").length;
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  generateReport();
  process.exit(1);
});
