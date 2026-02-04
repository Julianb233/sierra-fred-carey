#!/usr/bin/env tsx
/**
 * Journey API Test Script
 *
 * Tests all Journey Dashboard API endpoints to verify they're working correctly.
 * Run with: npx tsx scripts/test-journey-api.ts
 *
 * Requirements:
 * - Server must be running on localhost:3000
 * - User must be logged in (or provide auth token)
 * - Database must have journey tables created
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const SESSION_COOKIE = process.env.SESSION_COOKIE || "";

interface TestResult {
  endpoint: string;
  method: string;
  status: "PASS" | "FAIL" | "SKIP";
  statusCode?: number;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function testEndpoint(
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<TestResult> {
  const result: TestResult = {
    endpoint,
    method,
    status: "FAIL",
  };

  try {
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(SESSION_COOKIE ? { Cookie: SESSION_COOKIE } : {}),
      },
      credentials: "include",
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    result.statusCode = response.status;

    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
      return result;
    }

    const data = await response.json();
    result.data = data;

    if (data.success) {
      result.status = "PASS";
    } else {
      result.error = data.error || "Response success=false";
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

function printResult(result: TestResult) {
  const icon =
    result.status === "PASS" ? "✓" : result.status === "SKIP" ? "○" : "✗";
  const color =
    result.status === "PASS" ? "\x1b[32m" : result.status === "SKIP" ? "\x1b[33m" : "\x1b[31m";
  const reset = "\x1b[0m";

  console.log(`${color}${icon}${reset} ${result.method} ${result.endpoint}`);

  if (result.statusCode) {
    console.log(`  Status: ${result.statusCode}`);
  }

  if (result.error) {
    console.log(`  Error: ${result.error}`);
  }

  if (result.data && result.status === "PASS") {
    console.log(`  Data sample:`, JSON.stringify(result.data, null, 2).substring(0, 200));
  }

  console.log();
}

async function runTests() {
  console.log("=".repeat(60));
  console.log("Journey Dashboard API Test Suite");
  console.log("=".repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Session Cookie: ${SESSION_COOKIE ? "Provided" : "Not provided (may fail)"}`);
  console.log();

  // Test 1: Get journey stats
  console.log("Test 1: GET /api/journey/stats");
  const statsTest = await testEndpoint("/api/journey/stats");
  results.push(statsTest);
  printResult(statsTest);

  // Test 2: Get insights
  console.log("Test 2: GET /api/journey/insights");
  const insightsTest = await testEndpoint("/api/journey/insights?limit=10");
  results.push(insightsTest);
  printResult(insightsTest);

  // Test 3: Get milestones
  console.log("Test 3: GET /api/journey/milestones");
  const milestonesTest = await testEndpoint("/api/journey/milestones?limit=50");
  results.push(milestonesTest);
  printResult(milestonesTest);

  // Test 4: Get timeline
  console.log("Test 4: GET /api/journey/timeline");
  const timelineTest = await testEndpoint("/api/journey/timeline?limit=20");
  results.push(timelineTest);
  printResult(timelineTest);

  // Test 5: Create milestone (if auth works)
  if (statsTest.status === "PASS") {
    console.log("Test 5: POST /api/journey/milestones");
    const createMilestoneTest = await testEndpoint(
      "/api/journey/milestones",
      "POST",
      {
        title: "Test Milestone - API Verification",
        description: "Created by test script",
        category: "product",
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      }
    );
    results.push(createMilestoneTest);
    printResult(createMilestoneTest);

    // Test 6: Update milestone status (if create succeeded)
    if (createMilestoneTest.status === "PASS" && createMilestoneTest.data?.data?.id) {
      const milestoneId = createMilestoneTest.data.data.id;
      console.log(`Test 6: PATCH /api/journey/milestones/${milestoneId}`);
      const updateMilestoneTest = await testEndpoint(
        `/api/journey/milestones/${milestoneId}`,
        "PATCH",
        { status: "completed" }
      );
      results.push(updateMilestoneTest);
      printResult(updateMilestoneTest);
    }
  } else {
    console.log("Test 5-6: SKIPPED (auth required)");
    results.push({ endpoint: "/api/journey/milestones", method: "POST", status: "SKIP" });
  }

  // Summary
  console.log("=".repeat(60));
  console.log("Test Summary");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;

  console.log(`Total tests: ${results.length}`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`○ Skipped: ${skipped}`);
  console.log();

  if (failed > 0) {
    console.log("Failed tests:");
    results
      .filter((r) => r.status === "FAIL")
      .forEach((r) => {
        console.log(`  - ${r.method} ${r.endpoint}: ${r.error}`);
      });
    console.log();
  }

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error running tests:", error);
  process.exit(1);
});
