/**
 * Fred Call Route Tests
 *
 * Tests for POST /api/fred/call — LiveKit room creation and voice agent dispatch.
 * Covers: auth, validation, room creation, agent dispatch, token generation, S3 egress.
 *
 * AI-1415: QA voice integration end-to-end
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// Hoisted Mocks
// ============================================================================

const {
  mockRequireAuth,
  mockGetUserTier,
  mockCreateRoom,
  mockCreateDispatch,
  mockToJwt,
  mockAddGrant,
  mockStartEgress,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockGetUserTier: vi.fn(),
  mockCreateRoom: vi.fn(),
  mockCreateDispatch: vi.fn(),
  mockToJwt: vi.fn(),
  mockAddGrant: vi.fn(),
  mockStartEgress: vi.fn(),
}));

// ============================================================================
// Module Mocks
// ============================================================================

vi.mock("@/lib/auth", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/api/tier-middleware", () => ({
  getUserTier: mockGetUserTier,
  createTierErrorResponse: vi.fn(),
}));

vi.mock("@/lib/api/with-logging", () => ({
  withLogging: (handler: Function) => handler,
}));

vi.mock("livekit-server-sdk", () => {
  return {
    AccessToken: class MockAccessToken {
      constructor(...args: unknown[]) {}
      addGrant = mockAddGrant;
      toJwt = mockToJwt;
    },
    RoomServiceClient: class MockRoomServiceClient {
      constructor(...args: unknown[]) {}
      createRoom = mockCreateRoom;
    },
    AgentDispatchClient: class MockAgentDispatchClient {
      constructor(...args: unknown[]) {}
      createDispatch = mockCreateDispatch;
    },
    EgressClient: class MockEgressClient {
      constructor(...args: unknown[]) {}
      startRoomCompositeEgress = mockStartEgress;
    },
    EncodedFileOutput: class MockEncodedFileOutput {
      constructor(...args: unknown[]) {}
    },
    EncodedFileType: { OGG: "ogg" },
    S3Upload: class MockS3Upload {
      constructor(...args: unknown[]) {}
    },
  };
});

// ============================================================================
// Helpers
// ============================================================================

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/fred/call", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ============================================================================
// Tests
// ============================================================================

describe("POST /api/fred/call", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Set required env vars
    process.env.LIVEKIT_API_KEY = "test-api-key";
    process.env.LIVEKIT_API_SECRET = "test-api-secret";
    process.env.LIVEKIT_URL = "wss://test.livekit.cloud";

    // Remove S3 vars (optional feature)
    delete process.env.RECORDING_S3_ACCESS_KEY;
    delete process.env.RECORDING_S3_SECRET;
    delete process.env.RECORDING_S3_BUCKET;
    delete process.env.RECORDING_S3_REGION;

    // Default mock returns
    mockRequireAuth.mockResolvedValue("test-user-id");
    mockGetUserTier.mockResolvedValue(1); // PRO
    mockCreateRoom.mockResolvedValue({});
    mockCreateDispatch.mockResolvedValue({ id: "dispatch-123" });
    mockToJwt.mockResolvedValue("mock-jwt-token");
  });

  afterAll(() => {
    Object.assign(process.env, savedEnv);
  });

  it("returns 500 when LiveKit credentials are missing", async () => {
    delete process.env.LIVEKIT_API_KEY;

    const { POST } = await import("@/app/api/fred/call/route");
    const res = await POST(createRequest({ callType: "on-demand" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Voice calling is not configured");
  });

  it("returns 400 for invalid callType", async () => {
    const { POST } = await import("@/app/api/fred/call/route");
    const res = await POST(createRequest({ callType: "invalid-type" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid request");
  });

  it("creates room, dispatches agent, and returns token for on-demand call", async () => {
    const { POST } = await import("@/app/api/fred/call/route");
    const res = await POST(createRequest({ callType: "on-demand" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.token).toBe("mock-jwt-token");
    expect(body.url).toBe("wss://test.livekit.cloud");
    expect(body.room).toMatch(/^test-user-id_fred-call_\d+$/);
    expect(body.callType).toBe("on-demand");
    expect(body.maxDuration).toBe(600); // 10 minutes
    expect(body.egressId).toBeNull(); // No S3 configured

    // Verify room was created with correct params
    expect(mockCreateRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.stringContaining("test-user-id_fred-call_"),
        emptyTimeout: 300,
        maxParticipants: 2,
      })
    );

    // Verify agent was dispatched
    expect(mockCreateDispatch).toHaveBeenCalledWith(
      expect.stringContaining("test-user-id_fred-call_"),
      "fred-cary-voice",
      expect.objectContaining({
        metadata: expect.stringContaining("test-user-id"),
      })
    );

    // Verify token grants
    expect(mockAddGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
      })
    );
  });

  it("handles scheduled call type with longer duration", async () => {
    const { POST } = await import("@/app/api/fred/call/route");
    const res = await POST(
      createRequest({ callType: "scheduled", participantName: "John Doe" })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.callType).toBe("scheduled");
    expect(body.maxDuration).toBe(1800); // 30 minutes

    expect(mockCreateRoom).toHaveBeenCalledWith(
      expect.objectContaining({ emptyTimeout: 600 })
    );
  });

  it("defaults to on-demand when callType is omitted", async () => {
    const { POST } = await import("@/app/api/fred/call/route");
    const res = await POST(createRequest({}));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.callType).toBe("on-demand");
    expect(body.maxDuration).toBe(600);
  });

  it("starts S3 egress recording when S3 credentials are configured", async () => {
    process.env.RECORDING_S3_ACCESS_KEY = "s3-key";
    process.env.RECORDING_S3_SECRET = "s3-secret";
    process.env.RECORDING_S3_BUCKET = "recordings";
    process.env.RECORDING_S3_REGION = "us-east-1";

    mockStartEgress.mockResolvedValue({ egressId: "egress-456" });

    const { POST } = await import("@/app/api/fred/call/route");
    const res = await POST(createRequest({ callType: "on-demand" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.egressId).toBe("egress-456");
    expect(mockStartEgress).toHaveBeenCalled();
  });

  it("proceeds without recording when S3 egress fails", async () => {
    process.env.RECORDING_S3_ACCESS_KEY = "s3-key";
    process.env.RECORDING_S3_SECRET = "s3-secret";
    process.env.RECORDING_S3_BUCKET = "recordings";
    process.env.RECORDING_S3_REGION = "us-east-1";

    mockStartEgress.mockRejectedValue(new Error("S3 connection failed"));

    const { POST } = await import("@/app/api/fred/call/route");
    const res = await POST(createRequest({ callType: "on-demand" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.egressId).toBeNull();
  });

  it("returns 500 when room creation fails", async () => {
    mockCreateRoom.mockRejectedValue(new Error("LiveKit server unavailable"));

    const { POST } = await import("@/app/api/fred/call/route");
    const res = await POST(createRequest({ callType: "on-demand" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create call");
  });

  it("returns 500 when agent dispatch fails", async () => {
    mockCreateDispatch.mockRejectedValue(new Error("Agent not found"));

    const { POST } = await import("@/app/api/fred/call/route");
    const res = await POST(createRequest({ callType: "on-demand" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create call");
  });
});
