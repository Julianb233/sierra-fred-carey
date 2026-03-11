/**
 * Tests for Funnel → Full Platform Migration
 *
 * Verifies that funnel session data (chat messages + journey progress)
 * is correctly transformed and inserted into full platform tables.
 *
 * Linear: AI-2276
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Sample Data
// ============================================================================

const SAMPLE_SESSION = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  session_id: "funnel-session-abc123",
  chat_messages: [
    {
      id: "msg-1",
      role: "user",
      content: "I have an idea for a fintech startup",
      timestamp: "2026-03-01T10:00:00.000Z",
    },
    {
      id: "msg-2",
      role: "assistant",
      content: "That sounds interesting! Tell me more about the problem you're solving.",
      timestamp: "2026-03-01T10:00:05.000Z",
    },
    {
      id: "msg-3",
      role: "user",
      content: "Small businesses struggle with cash flow management",
      timestamp: "2026-03-01T10:01:00.000Z",
    },
  ],
  journey_progress: {
    "idea-0": true,
    "idea-1": true,
    "idea-2": false,
    "build-0": true,
  },
  funnel_version: "1.0",
  migrated_to_user_id: null,
  migrated_at: null,
  last_synced_at: "2026-03-01T10:05:00.000Z",
  created_at: "2026-03-01T09:00:00.000Z",
  updated_at: "2026-03-01T10:05:00.000Z",
};

const TARGET_USER_ID = "auth-user-uuid-12345";

// ============================================================================
// Mock Setup
// ============================================================================

// Track all inserts/updates for verification
let insertedChatMessages: any[] = [];
let insertedMilestones: any[] = [];
let insertedEvents: any[] = [];
let updatedSessions: any[] = [];
let mockSessionData: any = SAMPLE_SESSION;
let mockFetchError: any = null;
let mockChatInsertError: any = null;
let mockMilestoneInsertError: any = null;

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((tableName: string) => {
      if (tableName === "funnel_sessions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: mockSessionData,
                  error: mockFetchError,
                })
              ),
            })),
          })),
          update: vi.fn((data: any) => {
            updatedSessions.push(data);
            return {
              eq: vi.fn(() =>
                Promise.resolve({ error: null })
              ),
            };
          }),
          upsert: vi.fn(() => Promise.resolve({ error: null })),
        };
      }

      if (tableName === "chat_messages") {
        return {
          insert: vi.fn((rows: any[]) => {
            insertedChatMessages.push(...rows);
            return Promise.resolve({ error: mockChatInsertError });
          }),
        };
      }

      if (tableName === "milestones") {
        return {
          insert: vi.fn((rows: any[]) => {
            insertedMilestones.push(...rows);
            return Promise.resolve({ error: mockMilestoneInsertError });
          }),
        };
      }

      if (tableName === "journey_events") {
        return {
          insert: vi.fn((rows: any[]) => {
            insertedEvents.push(...rows);
            return Promise.resolve({ error: null });
          }),
        };
      }

      return {};
    }),
  })),
}));

beforeEach(() => {
  insertedChatMessages = [];
  insertedMilestones = [];
  insertedEvents = [];
  updatedSessions = [];
  mockSessionData = { ...SAMPLE_SESSION };
  mockFetchError = null;
  mockChatInsertError = null;
  mockMilestoneInsertError = null;
});

// ============================================================================
// Tests
// ============================================================================

describe("migrateFunnelSession", () => {
  it("migrates chat messages with correct user_id and timestamps", async () => {
    const { migrateFunnelSession } = await import("../funnel-migration");

    const result = await migrateFunnelSession(
      SAMPLE_SESSION.session_id,
      TARGET_USER_ID
    );

    expect(result.success).toBe(true);
    expect(result.chatMessagesCount).toBe(3);

    // Verify user_id was set on all messages
    expect(insertedChatMessages).toHaveLength(3);
    insertedChatMessages.forEach((msg) => {
      expect(msg.user_id).toBe(TARGET_USER_ID);
      expect(msg.session_id).toBe(SAMPLE_SESSION.session_id);
    });

    // Verify message content preserved
    expect(insertedChatMessages[0].content).toBe(
      "I have an idea for a fintech startup"
    );
    expect(insertedChatMessages[0].role).toBe("user");
    expect(insertedChatMessages[1].role).toBe("assistant");

    // Verify timestamps preserved
    expect(insertedChatMessages[0].created_at).toBe(
      "2026-03-01T10:00:00.000Z"
    );
  });

  it("maps journey progress to milestones with correct categories", async () => {
    const { migrateFunnelSession } = await import("../funnel-migration");

    const result = await migrateFunnelSession(
      SAMPLE_SESSION.session_id,
      TARGET_USER_ID
    );

    expect(result.success).toBe(true);
    // 4 journey keys: idea-0 (true), idea-1 (true), idea-2 (false), build-0 (true)
    expect(result.milestonesCount).toBe(4);

    // Verify milestone categories
    const ideaMilestones = insertedMilestones.filter(
      (m) => m.category === "product" && m.title.includes("problem")
    );
    expect(ideaMilestones).toHaveLength(1);
    expect(ideaMilestones[0].status).toBe("completed");

    // Verify incomplete milestone
    const incompleteMilestones = insertedMilestones.filter(
      (m) => m.status === "pending"
    );
    expect(incompleteMilestones).toHaveLength(1);
    expect(incompleteMilestones[0].title).toBe(
      "Validate demand (10+ conversations)"
    );
  });

  it("creates journey_events only for completed milestones", async () => {
    const { migrateFunnelSession } = await import("../funnel-migration");

    await migrateFunnelSession(SAMPLE_SESSION.session_id, TARGET_USER_ID);

    // 3 completed milestones: idea-0, idea-1, build-0
    expect(insertedEvents).toHaveLength(3);
    insertedEvents.forEach((evt) => {
      expect(evt.event_type).toBe("milestone_achieved");
      expect(evt.event_data.source).toBe("funnel_migration");
      expect(evt.user_id).toBe(TARGET_USER_ID);
    });
  });

  it("marks session as migrated after success", async () => {
    const { migrateFunnelSession } = await import("../funnel-migration");

    await migrateFunnelSession(SAMPLE_SESSION.session_id, TARGET_USER_ID);

    expect(updatedSessions).toHaveLength(1);
    expect(updatedSessions[0].migrated_to_user_id).toBe(TARGET_USER_ID);
    expect(updatedSessions[0].migrated_at).toBeDefined();
  });

  it("returns alreadyMigrated when session was previously migrated", async () => {
    const { migrateFunnelSession } = await import("../funnel-migration");

    mockSessionData = {
      ...SAMPLE_SESSION,
      migrated_to_user_id: "existing-user-id",
      migrated_at: "2026-03-01T12:00:00.000Z",
    };

    const result = await migrateFunnelSession(
      SAMPLE_SESSION.session_id,
      TARGET_USER_ID
    );

    expect(result.success).toBe(true);
    expect(result.alreadyMigrated).toBe(true);
    expect(result.userId).toBe("existing-user-id");
    expect(insertedChatMessages).toHaveLength(0);
    expect(insertedMilestones).toHaveLength(0);
  });

  it("returns error when session not found", async () => {
    const { migrateFunnelSession } = await import("../funnel-migration");

    mockSessionData = null;
    mockFetchError = { message: "No rows found", code: "PGRST116" };

    const result = await migrateFunnelSession("nonexistent-session", TARGET_USER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("handles empty chat messages gracefully", async () => {
    const { migrateFunnelSession } = await import("../funnel-migration");

    mockSessionData = {
      ...SAMPLE_SESSION,
      chat_messages: [],
    };

    const result = await migrateFunnelSession(
      SAMPLE_SESSION.session_id,
      TARGET_USER_ID
    );

    expect(result.success).toBe(true);
    expect(result.chatMessagesCount).toBe(0);
    expect(insertedChatMessages).toHaveLength(0);
  });

  it("handles empty journey progress gracefully", async () => {
    const { migrateFunnelSession } = await import("../funnel-migration");

    mockSessionData = {
      ...SAMPLE_SESSION,
      journey_progress: {},
    };

    const result = await migrateFunnelSession(
      SAMPLE_SESSION.session_id,
      TARGET_USER_ID
    );

    expect(result.success).toBe(true);
    expect(result.milestonesCount).toBe(0);
  });

  it("skips invalid journey keys without failing", async () => {
    const { migrateFunnelSession } = await import("../funnel-migration");

    mockSessionData = {
      ...SAMPLE_SESSION,
      journey_progress: {
        "idea-0": true,
        "invalid-key-format!!!": true,
        "nonexistent-99": true,
        "build-0": true,
      },
    };

    const result = await migrateFunnelSession(
      SAMPLE_SESSION.session_id,
      TARGET_USER_ID
    );

    expect(result.success).toBe(true);
    // Only idea-0 and build-0 are valid, nonexistent-99 has no matching stage
    expect(insertedMilestones.length).toBeLessThanOrEqual(2);
  });

  it("returns error when chat insert fails", async () => {
    const { migrateFunnelSession } = await import("../funnel-migration");

    mockChatInsertError = { message: "Connection refused", code: "ECONNREFUSED" };

    const result = await migrateFunnelSession(
      SAMPLE_SESSION.session_id,
      TARGET_USER_ID
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("chat messages");
  });

  it("preserves funnel metadata on milestones", async () => {
    const { migrateFunnelSession } = await import("../funnel-migration");

    await migrateFunnelSession(SAMPLE_SESSION.session_id, TARGET_USER_ID);

    insertedMilestones.forEach((m) => {
      expect(m.metadata.source).toBe("funnel");
      expect(m.metadata.funnel_version).toBe("1.0");
      expect(m.metadata.funnel_key).toBeDefined();
    });
  });

  it("maps stage categories correctly", async () => {
    const { migrateFunnelSession } = await import("../funnel-migration");

    mockSessionData = {
      ...SAMPLE_SESSION,
      journey_progress: {
        "idea-0": true,
        "build-0": true,
        "launch-0": true,
        "scale-0": true,
        "fund-0": true,
      },
    };

    await migrateFunnelSession(SAMPLE_SESSION.session_id, TARGET_USER_ID);

    const categories = insertedMilestones.map((m) => m.category);
    expect(categories).toContain("product"); // idea, build
    expect(categories).toContain("growth"); // launch, scale
    expect(categories).toContain("fundraising"); // fund
  });
});

describe("getFunnelSession", () => {
  it("returns session data when found", async () => {
    const { getFunnelSession } = await import("../funnel-migration");

    const session = await getFunnelSession(SAMPLE_SESSION.session_id);
    expect(session).toBeDefined();
  });

  it("returns null when session not found", async () => {
    const { getFunnelSession } = await import("../funnel-migration");

    mockSessionData = null;
    mockFetchError = { message: "Not found" };

    const session = await getFunnelSession("nonexistent");
    expect(session).toBeNull();
  });
});
