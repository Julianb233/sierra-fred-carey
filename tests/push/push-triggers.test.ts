/**
 * Tests for Push Notification Trigger functions
 *
 * Verifies that each trigger formats the correct payload and calls sendPushToUser,
 * and that triggers are silent no-ops when VAPID is not configured.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock sendPushToUser before importing triggers
const mockSendPushToUser = vi.fn();

vi.mock("@/lib/push", () => ({
  sendPushToUser: (...args: unknown[]) => mockSendPushToUser(...args),
}));

import {
  notifyRedFlag,
  notifyWellbeingAlert,
  notifyAgentComplete,
  notifyInboxMessage,
} from "@/lib/push/triggers";

describe("Push Notification Triggers", () => {
  beforeEach(() => {
    mockSendPushToUser.mockReset();
    mockSendPushToUser.mockResolvedValue({ sent: 1, failed: 0, removed: 0 });
  });

  // ---------- notifyRedFlag ----------

  describe("notifyRedFlag", () => {
    it("should call sendPushToUser with correct payload", async () => {
      notifyRedFlag("user-123", {
        id: "flag-1",
        category: "Cash Flow",
        title: "Runway dropping below 3 months",
        severity: "critical",
      });

      // Allow the fire-and-forget promise to resolve
      await vi.waitFor(() => {
        expect(mockSendPushToUser).toHaveBeenCalledOnce();
      });

      const [userId, payload] = mockSendPushToUser.mock.calls[0];
      expect(userId).toBe("user-123");
      expect(payload.title).toBe("Red Flag: Cash Flow");
      expect(payload.body).toBe("Runway dropping below 3 months");
      expect(payload.url).toBe("/dashboard/red-flags");
      expect(payload.tag).toBe("red-flag-flag-1");
      expect(payload.data).toEqual({
        type: "red_flag",
        flagId: "flag-1",
        severity: "critical",
      });
    });

    it("should use category as tag fallback when id is missing", async () => {
      notifyRedFlag("user-456", {
        category: "Churn",
        title: "Customer churn increasing",
        severity: "high",
      });

      await vi.waitFor(() => {
        expect(mockSendPushToUser).toHaveBeenCalledOnce();
      });

      const [, payload] = mockSendPushToUser.mock.calls[0];
      expect(payload.tag).toBe("red-flag-Churn");
      expect(payload.data?.flagId).toBeUndefined();
    });

    it("should not throw when sendPushToUser rejects", async () => {
      mockSendPushToUser.mockRejectedValue(new Error("Network error"));

      // Should not throw
      expect(() => {
        notifyRedFlag("user-789", {
          category: "Revenue",
          title: "MRR declining",
          severity: "medium",
        });
      }).not.toThrow();
    });
  });

  // ---------- notifyWellbeingAlert ----------

  describe("notifyWellbeingAlert", () => {
    it("should call sendPushToUser with correct payload", async () => {
      notifyWellbeingAlert("user-123", {
        type: "burnout",
        message: "You seem stressed. Consider taking a break.",
        severity: "high",
      });

      await vi.waitFor(() => {
        expect(mockSendPushToUser).toHaveBeenCalledOnce();
      });

      const [userId, payload] = mockSendPushToUser.mock.calls[0];
      expect(userId).toBe("user-123");
      expect(payload.title).toBe("Wellbeing Alert: burnout");
      expect(payload.body).toBe("You seem stressed. Consider taking a break.");
      expect(payload.url).toBe("/dashboard/wellbeing");
      expect(payload.tag).toBe("wellbeing-burnout");
      expect(payload.data).toEqual({
        type: "wellbeing",
        alertType: "burnout",
        severity: "high",
      });
    });

    it("should not throw when sendPushToUser rejects", async () => {
      mockSendPushToUser.mockRejectedValue(new Error("Push failed"));

      expect(() => {
        notifyWellbeingAlert("user-123", {
          type: "stress",
          message: "Detected stress signals",
          severity: "low",
        });
      }).not.toThrow();
    });
  });

  // ---------- notifyAgentComplete ----------

  describe("notifyAgentComplete", () => {
    it("should format success message correctly", async () => {
      notifyAgentComplete("user-123", "Inbox Ops", {
        agentName: "Inbox Ops",
        result: "success",
        summary: "Processed 5 messages and drafted 3 replies.",
      });

      await vi.waitFor(() => {
        expect(mockSendPushToUser).toHaveBeenCalledOnce();
      });

      const [userId, payload] = mockSendPushToUser.mock.calls[0];
      expect(userId).toBe("user-123");
      expect(payload.title).toBe("Agent Inbox Ops completed");
      expect(payload.body).toBe("Processed 5 messages and drafted 3 replies.");
      expect(payload.url).toBe("/dashboard");
      expect(payload.tag).toBe("agent-Inbox Ops");
      expect(payload.data).toEqual({
        type: "agent_complete",
        agentName: "Inbox Ops",
        result: "success",
      });
    });

    it("should format failure message correctly", async () => {
      notifyAgentComplete("user-123", "Research", {
        agentName: "Research",
        result: "failure",
      });

      await vi.waitFor(() => {
        expect(mockSendPushToUser).toHaveBeenCalledOnce();
      });

      const [, payload] = mockSendPushToUser.mock.calls[0];
      expect(payload.title).toBe("Agent Research failed");
      expect(payload.body).toBe("The Research agent has failed.");
    });

    it("should format partial completion message correctly", async () => {
      notifyAgentComplete("user-123", "Analysis", {
        agentName: "Analysis",
        result: "partial",
        summary: "3 of 5 tasks completed.",
      });

      await vi.waitFor(() => {
        expect(mockSendPushToUser).toHaveBeenCalledOnce();
      });

      const [, payload] = mockSendPushToUser.mock.calls[0];
      expect(payload.title).toBe("Agent Analysis partially completed");
      expect(payload.body).toBe("3 of 5 tasks completed.");
    });

    it("should not throw when sendPushToUser rejects", async () => {
      mockSendPushToUser.mockRejectedValue(new Error("Push failed"));

      expect(() => {
        notifyAgentComplete("user-123", "Test", {
          agentName: "Test",
          result: "success",
        });
      }).not.toThrow();
    });
  });

  // ---------- notifyInboxMessage ----------

  describe("notifyInboxMessage", () => {
    it("should call sendPushToUser with correct payload", async () => {
      notifyInboxMessage("user-123", {
        id: "msg-42",
        subject: "Partnership proposal from Acme Corp",
        preview: "Hi, we would like to discuss a potential partnership...",
        source: "email",
      });

      await vi.waitFor(() => {
        expect(mockSendPushToUser).toHaveBeenCalledOnce();
      });

      const [userId, payload] = mockSendPushToUser.mock.calls[0];
      expect(userId).toBe("user-123");
      expect(payload.title).toBe("Partnership proposal from Acme Corp");
      expect(payload.body).toBe("Hi, we would like to discuss a potential partnership...");
      expect(payload.url).toBe("/dashboard/inbox");
      expect(payload.tag).toBe("inbox-msg-42");
      expect(payload.data).toEqual({
        type: "inbox",
        messageId: "msg-42",
        source: "email",
      });
    });

    it("should use fallback tag when id is missing", async () => {
      notifyInboxMessage("user-123", {
        subject: "Quick question",
        preview: "Hey, just wanted to ask...",
      });

      await vi.waitFor(() => {
        expect(mockSendPushToUser).toHaveBeenCalledOnce();
      });

      const [, payload] = mockSendPushToUser.mock.calls[0];
      expect(payload.tag).toBe("inbox-new");
      expect(payload.data?.messageId).toBeUndefined();
      expect(payload.data?.source).toBeUndefined();
    });

    it("should not throw when sendPushToUser rejects", async () => {
      mockSendPushToUser.mockRejectedValue(new Error("Push failed"));

      expect(() => {
        notifyInboxMessage("user-123", {
          subject: "Test",
          preview: "Test preview",
        });
      }).not.toThrow();
    });
  });

  // ---------- No-op when sendPushToUser returns zero ----------

  describe("no-op behavior", () => {
    it("should gracefully handle sendPushToUser returning zero sent", async () => {
      mockSendPushToUser.mockResolvedValue({ sent: 0, failed: 0, removed: 0 });

      notifyRedFlag("user-no-push", {
        category: "Test",
        title: "Test flag",
        severity: "low",
      });

      await vi.waitFor(() => {
        expect(mockSendPushToUser).toHaveBeenCalledOnce();
      });

      // No error should be thrown, function completes silently
      const [userId] = mockSendPushToUser.mock.calls[0];
      expect(userId).toBe("user-no-push");
    });
  });
});
