/**
 * Tests for Push Notification Preferences module
 *
 * Verifies preference CRUD operations (getPreferences, updatePreferences,
 * isCategoryEnabled) and the mergePreferences helper that blends stored
 * overrides with category defaults.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Mocks ----------

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

// Mock chain builder for Supabase queries
function createChain(terminalValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const self = () => chain;

  chain.from = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockResolvedValue(terminalValue);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.upsert = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(terminalValue);
  chain.single = vi.fn().mockResolvedValue(terminalValue);

  return chain;
}

let mockChain: ReturnType<typeof createChain>;

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => mockChain,
}));

import {
  getPreferences,
  updatePreferences,
  isCategoryEnabled,
  PUSH_CATEGORY_DEFAULTS,
  PUSH_CATEGORIES,
  type PushCategory,
  type PushPreferences,
} from "@/lib/push/preferences";

// ---------- Tests ----------

describe("Push Notification Preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChain = createChain({ data: null, error: null });
  });

  // ---------- PUSH_CATEGORY_DEFAULTS ----------

  describe("PUSH_CATEGORY_DEFAULTS", () => {
    it("should define all five categories", () => {
      expect(PUSH_CATEGORIES).toHaveLength(5);
      expect(PUSH_CATEGORIES).toEqual(
        expect.arrayContaining([
          "red_flags",
          "wellbeing_alerts",
          "agent_completions",
          "inbox_messages",
          "weekly_digest",
        ]),
      );
    });

    it("should default all categories to enabled", () => {
      for (const category of PUSH_CATEGORIES) {
        expect(PUSH_CATEGORY_DEFAULTS[category].enabled).toBe(true);
      }
    });

    it("should include label and description for each category", () => {
      for (const category of PUSH_CATEGORIES) {
        expect(PUSH_CATEGORY_DEFAULTS[category].label).toBeTruthy();
        expect(PUSH_CATEGORY_DEFAULTS[category].description).toBeTruthy();
      }
    });
  });

  // ---------- getPreferences ----------

  describe("getPreferences", () => {
    it("should return defaults when user has no push subscriptions", async () => {
      // First query: push_subscriptions returns empty array
      mockChain.limit = vi.fn().mockResolvedValue({ data: [], error: null });

      const prefs = await getPreferences("user-no-subs");
      expect(prefs).toEqual(PUSH_CATEGORY_DEFAULTS);
    });

    it("should return defaults when push_subscriptions query errors", async () => {
      mockChain.limit = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "DB error", code: "42P01" },
      });

      const prefs = await getPreferences("user-error");
      expect(prefs).toEqual(PUSH_CATEGORY_DEFAULTS);
    });

    it("should return defaults when notification_configs has no push row", async () => {
      // First query succeeds with a subscription
      let callCount = 0;
      mockChain.limit = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // push_subscriptions has a subscription
          return Promise.resolve({ data: [{ id: "sub-1" }], error: null });
        }
        return mockChain;
      });
      mockChain.maybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const prefs = await getPreferences("user-no-config");
      expect(prefs).toEqual(PUSH_CATEGORY_DEFAULTS);
    });

    it("should merge stored overrides with defaults", async () => {
      let callCount = 0;
      mockChain.limit = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: [{ id: "sub-1" }], error: null });
        }
        return mockChain;
      });
      mockChain.maybeSingle = vi.fn().mockResolvedValue({
        data: {
          metadata: {
            red_flags: { enabled: false },
            weekly_digest: { enabled: false },
          },
        },
        error: null,
      });

      const prefs = await getPreferences("user-with-overrides");

      // Overridden categories
      expect(prefs.red_flags.enabled).toBe(false);
      expect(prefs.weekly_digest.enabled).toBe(false);

      // Non-overridden categories retain defaults
      expect(prefs.wellbeing_alerts.enabled).toBe(true);
      expect(prefs.agent_completions.enabled).toBe(true);
      expect(prefs.inbox_messages.enabled).toBe(true);

      // Labels and descriptions are preserved from defaults
      expect(prefs.red_flags.label).toBe(PUSH_CATEGORY_DEFAULTS.red_flags.label);
      expect(prefs.red_flags.description).toBe(PUSH_CATEGORY_DEFAULTS.red_flags.description);
    });

    it("should handle notification_configs read error gracefully", async () => {
      let callCount = 0;
      mockChain.limit = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: [{ id: "sub-1" }], error: null });
        }
        return mockChain;
      });
      mockChain.maybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Table error", code: "42P01" },
      });

      const prefs = await getPreferences("user-config-error");
      expect(prefs).toEqual(PUSH_CATEGORY_DEFAULTS);
    });
  });

  // ---------- updatePreferences ----------

  describe("updatePreferences", () => {
    it("should reject invalid category names", async () => {
      await expect(
        updatePreferences("user-123", "invalid_category" as PushCategory, false),
      ).rejects.toThrow("Invalid push category");
    });

    it("should update existing notification_configs row", async () => {
      // Read returns existing row
      mockChain.maybeSingle = vi.fn().mockResolvedValue({
        data: {
          id: "config-1",
          metadata: { red_flags: { enabled: true } },
        },
        error: null,
      });

      // Update succeeds
      mockChain.eq = vi.fn().mockReturnValue(mockChain);
      mockChain.update = vi.fn().mockReturnValue(mockChain);
      // Make the final .eq() after .update() resolve successfully
      let updateEqCallCount = 0;
      const originalEq = mockChain.eq;
      mockChain.eq = vi.fn().mockImplementation((...args) => {
        updateEqCallCount++;
        // After update, .eq("id", ...) resolves the promise
        if (updateEqCallCount >= 3) {
          return Promise.resolve({ error: null });
        }
        return originalEq(...args);
      });

      const prefs = await updatePreferences("user-123", "red_flags", false);

      expect(prefs.red_flags.enabled).toBe(false);
      // Other defaults should be present
      expect(prefs.wellbeing_alerts.enabled).toBe(true);
    });

    it("should insert new notification_configs row when none exists", async () => {
      // Read returns no existing row
      mockChain.maybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      // Insert succeeds
      mockChain.insert = vi.fn().mockResolvedValue({ error: null });

      const prefs = await updatePreferences("user-new", "inbox_messages", false);

      expect(prefs.inbox_messages.enabled).toBe(false);
      expect(mockChain.insert).toHaveBeenCalled();
    });

    it("should throw when update query fails", async () => {
      mockChain.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: "config-1", metadata: {} },
        error: null,
      });

      // Make the .eq() after .update() reject
      let eqCallCount = 0;
      mockChain.eq = vi.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount >= 3) {
          return Promise.resolve({ error: { message: "Update failed" } });
        }
        return mockChain;
      });

      await expect(
        updatePreferences("user-fail", "agent_completions", true),
      ).rejects.toBeTruthy();
    });
  });

  // ---------- isCategoryEnabled ----------

  describe("isCategoryEnabled", () => {
    it("should return true when category is enabled (default)", async () => {
      // No subscriptions -> returns defaults (all true)
      mockChain.limit = vi.fn().mockResolvedValue({ data: [], error: null });

      const result = await isCategoryEnabled("user-123", "red_flags");
      expect(result).toBe(true);
    });

    it("should return false when category is explicitly disabled", async () => {
      let callCount = 0;
      mockChain.limit = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: [{ id: "sub-1" }], error: null });
        }
        return mockChain;
      });
      mockChain.maybeSingle = vi.fn().mockResolvedValue({
        data: {
          metadata: {
            red_flags: { enabled: false },
          },
        },
        error: null,
      });

      const result = await isCategoryEnabled("user-disabled", "red_flags");
      expect(result).toBe(false);
    });

    it("should return true when category is not in stored preferences (fallback to default)", async () => {
      let callCount = 0;
      mockChain.limit = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: [{ id: "sub-1" }], error: null });
        }
        return mockChain;
      });
      mockChain.maybeSingle = vi.fn().mockResolvedValue({
        data: {
          metadata: {
            // Only red_flags is stored, wellbeing_alerts is not
            red_flags: { enabled: false },
          },
        },
        error: null,
      });

      const result = await isCategoryEnabled("user-partial", "wellbeing_alerts");
      expect(result).toBe(true);
    });
  });
});
