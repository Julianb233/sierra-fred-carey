/**
 * Tests for Rate Limiting Middleware
 */

import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  checkRateLimit,
  checkRateLimitForUser,
  createRateLimitResponse,
  RATE_LIMIT_TIERS,
  type RateLimitConfig,
} from "../rate-limit";

// Create a test request with a specific IP
function createMockRequest(ip: string = "127.0.0.1"): NextRequest {
  const headers = new Headers();
  headers.set("x-forwarded-for", ip);
  return new NextRequest(new URL("http://localhost/api/test"), {
    headers,
  });
}

describe("Rate Limiting", () => {
  describe("checkRateLimit", () => {
    const config: RateLimitConfig = {
      limit: 5,
      windowSeconds: 60,
    };

    it("should allow requests under the limit", async () => {
      const identifier = `test-${Date.now()}-1`;

      const result1 = await checkRateLimit(identifier, config);
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(4);

      const result2 = await checkRateLimit(identifier, config);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(3);
    });

    it("should block requests over the limit", async () => {
      const identifier = `test-${Date.now()}-2`;

      // Make 5 requests to reach the limit
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit(identifier, config);
        expect(result.success).toBe(true);
      }

      // 6th request should be blocked
      const blocked = await checkRateLimit(identifier, config);
      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfter).toBeDefined();
      expect(blocked.retryAfter).toBeGreaterThan(0);
    });

    it("should track limits per identifier", async () => {
      const id1 = `user-${Date.now()}-1`;
      const id2 = `user-${Date.now()}-2`;

      // Exhaust limit for id1
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(id1, config);
      }

      // id1 should be blocked
      expect((await checkRateLimit(id1, config)).success).toBe(false);

      // id2 should still have full quota
      const result = await checkRateLimit(id2, config);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should return correct rate limit metadata", async () => {
      const identifier = `test-${Date.now()}-3`;

      const result = await checkRateLimit(identifier, config);

      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4);
      expect(result.reset).toBeGreaterThan(0);
      expect(result.reset).toBeLessThanOrEqual(60);
    });
  });

  describe("checkRateLimitForUser", () => {
    it("should check rate limit for a user", async () => {
      const req = createMockRequest();
      const userId = `user-${Date.now()}`;

      const { response, result } = await checkRateLimitForUser(req, userId, "free");

      expect(response).toBeNull();
      expect(result.success).toBe(true);
      expect(result.limit).toBe(RATE_LIMIT_TIERS.free.limit);
    });

    it("should return rate limit response when exceeded", async () => {
      const req = createMockRequest();
      const userId = `user-${Date.now()}-blocked`;

      // Exhaust limit
      for (let i = 0; i < RATE_LIMIT_TIERS.free.limit; i++) {
        await checkRateLimitForUser(req, userId, "free");
      }

      // Next request should be blocked
      const { response, result } = await checkRateLimitForUser(req, userId, "free");

      expect(response).not.toBeNull();
      expect(result.success).toBe(false);
      if (response) {
        expect(response.status).toBe(429);
      }
    });

    it("should support different tiers", async () => {
      const req = createMockRequest();

      const freeUserId = `free-user-${Date.now()}`;
      const proUserId = `pro-user-${Date.now()}`;

      const freeResult = await checkRateLimitForUser(req, freeUserId, "free");
      const proResult = await checkRateLimitForUser(req, proUserId, "pro");

      expect(freeResult.result.limit).toBe(20);
      expect(proResult.result.limit).toBe(100);
    });
  });

  describe("createRateLimitResponse", () => {
    it("should create a proper 429 response", async () => {
      const result = {
        success: false,
        limit: 20,
        remaining: 0,
        reset: 45,
        retryAfter: 45,
      };

      const response = createRateLimitResponse(result);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Rate limit exceeded");
      expect(data.retryAfter).toBe(45);

      // Check headers
      expect(response.headers.get("X-RateLimit-Limit")).toBe("20");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(response.headers.get("X-RateLimit-Reset")).toBe("45");
      expect(response.headers.get("Retry-After")).toBe("45");
    });
  });

  describe("RATE_LIMIT_TIERS", () => {
    it("should have all expected tiers", () => {
      expect(RATE_LIMIT_TIERS.free).toBeDefined();
      expect(RATE_LIMIT_TIERS.pro).toBeDefined();
      expect(RATE_LIMIT_TIERS.studio).toBeDefined();
      expect(RATE_LIMIT_TIERS.unlimited).toBeDefined();
    });

    it("should have increasing limits by tier", () => {
      expect(RATE_LIMIT_TIERS.free.limit).toBeLessThan(RATE_LIMIT_TIERS.pro.limit);
      expect(RATE_LIMIT_TIERS.pro.limit).toBeLessThan(RATE_LIMIT_TIERS.studio.limit);
      expect(RATE_LIMIT_TIERS.studio.limit).toBeLessThan(RATE_LIMIT_TIERS.unlimited.limit);
    });
  });
});
