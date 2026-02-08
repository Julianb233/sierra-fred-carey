/**
 * Tests for Web Push notification utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock web-push before importing the module under test
const mockSendNotification = vi.fn();
const mockSetVapidDetails = vi.fn();

vi.mock("web-push", () => ({
  default: {
    sendNotification: mockSendNotification,
    setVapidDetails: mockSetVapidDetails,
  },
  sendNotification: mockSendNotification,
  setVapidDetails: mockSetVapidDetails,
}));

// Mock logger as a named export
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

// Mock supabase service client
const mockSupabaseFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: mockSupabaseFrom,
  }),
}));

describe("Push Utilities", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    mockSendNotification.mockReset();
    mockSetVapidDetails.mockReset();
    mockSupabaseFrom.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getVapidPublicKey", () => {
    it("should return the VAPID public key from env", async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key-123";
      const { getVapidPublicKey } = await import("@/lib/push/index");
      expect(getVapidPublicKey()).toBe("test-public-key-123");
    });

    it("should return null when VAPID key is not set", async () => {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const { getVapidPublicKey } = await import("@/lib/push/index");
      expect(getVapidPublicKey()).toBeNull();
    });
  });

  describe("sendPushNotification", () => {
    it("should no-op when VAPID keys are not configured", async () => {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      delete process.env.VAPID_SUBJECT;

      const { sendPushNotification } = await import("@/lib/push/index");

      const result = await sendPushNotification(
        { endpoint: "https://push.example.com/sub1", p256dh_key: "p256dh", auth_key: "auth" },
        { title: "Test", body: "Hello" },
      );

      expect(result).toBe(false);
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it("should send notification when VAPID keys are configured", async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
      process.env.VAPID_PRIVATE_KEY = "test-private-key";
      process.env.VAPID_SUBJECT = "mailto:test@example.com";

      mockSendNotification.mockResolvedValue({});

      const { sendPushNotification } = await import("@/lib/push/index");

      const result = await sendPushNotification(
        { endpoint: "https://push.example.com/sub1", p256dh_key: "p256dh-key", auth_key: "auth-key" },
        { title: "Test Title", body: "Test Body", url: "/dashboard" },
      );

      expect(result).toBe(true);
      expect(mockSendNotification).toHaveBeenCalledWith(
        {
          endpoint: "https://push.example.com/sub1",
          keys: { p256dh: "p256dh-key", auth: "auth-key" },
        },
        JSON.stringify({ title: "Test Title", body: "Test Body", url: "/dashboard" }),
        expect.objectContaining({
          vapidDetails: {
            subject: "mailto:test@example.com",
            publicKey: "test-public-key",
            privateKey: "test-private-key",
          },
          TTL: 3600,
        }),
      );
    });

    it("should return false when notification send fails", async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
      process.env.VAPID_PRIVATE_KEY = "test-private-key";
      process.env.VAPID_SUBJECT = "mailto:test@example.com";

      mockSendNotification.mockRejectedValue({ statusCode: 500, message: "Server error" });

      const { sendPushNotification } = await import("@/lib/push/index");

      const result = await sendPushNotification(
        { endpoint: "https://push.example.com/sub1", p256dh_key: "p256dh", auth_key: "auth" },
        { title: "Test", body: "Hello" },
      );

      expect(result).toBe(false);
    });

    it("should return false for expired subscriptions (410)", async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
      process.env.VAPID_PRIVATE_KEY = "test-private-key";
      process.env.VAPID_SUBJECT = "mailto:test@example.com";

      mockSendNotification.mockRejectedValue({ statusCode: 410, message: "Gone" });

      const { sendPushNotification } = await import("@/lib/push/index");

      const result = await sendPushNotification(
        { endpoint: "https://push.example.com/expired", p256dh_key: "p256dh", auth_key: "auth" },
        { title: "Test", body: "Hello" },
      );

      expect(result).toBe(false);
    });
  });

  describe("sendPushToUser", () => {
    it("should no-op when VAPID keys are not configured", async () => {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      delete process.env.VAPID_SUBJECT;

      const { sendPushToUser } = await import("@/lib/push/index");

      const result = await sendPushToUser("user-123", { title: "Test", body: "Hello" });

      expect(result).toEqual({ sent: 0, failed: 0, removed: 0 });
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });
  });
});
