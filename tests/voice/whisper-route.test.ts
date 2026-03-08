/**
 * Whisper Transcription Route Tests
 *
 * Tests for POST /api/fred/whisper — voice-to-text transcription via OpenAI Whisper.
 * Covers: file validation, size limits, empty recordings, API errors, rate limiting.
 *
 * AI-1415: QA voice integration end-to-end
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// Hoisted Mocks
// ============================================================================

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("openai", () => {
  class MockAPIError extends Error {
    status: number;
    constructor(status: number, body: unknown, message: string, headers: unknown) {
      super(message);
      this.status = status;
      this.name = "APIError";
    }
  }

  class MockOpenAI {
    audio = {
      transcriptions: {
        create: mockCreate,
      },
    };
    static APIError = MockAPIError;
  }

  return {
    default: MockOpenAI,
    APIError: MockAPIError,
  };
});

// ============================================================================
// Helpers
// ============================================================================

function createAudioFormData(
  audioContent: string | Buffer = "fake audio content that is long enough to pass the minimum 100 byte size check - this needs to be over one hundred bytes of padding data so that the whisper route actually calls OpenAI transcription",
  filename = "recording.webm",
  mimeType = "audio/webm"
): FormData {
  const blob = new Blob([audioContent], { type: mimeType });
  const file = new File([blob], filename, { type: mimeType });
  const formData = new FormData();
  formData.append("audio", file);
  return formData;
}

function createRequest(formData: FormData): NextRequest {
  return new NextRequest("http://localhost:3000/api/fred/whisper", {
    method: "POST",
    body: formData,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe("POST /api/fred/whisper", () => {
  const originalEnv = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.OPENAI_API_KEY = "test-openai-key";
  });

  afterAll(() => {
    process.env.OPENAI_API_KEY = originalEnv;
  });

  it("returns 503 when OPENAI_API_KEY is not set", async () => {
    delete process.env.OPENAI_API_KEY;

    const { POST } = await import("@/app/api/fred/whisper/route");
    const formData = createAudioFormData();
    const res = await POST(createRequest(formData));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe("Voice transcription is not configured");
  });

  it("returns 400 when no audio file is provided", async () => {
    const { POST } = await import("@/app/api/fred/whisper/route");
    const formData = new FormData();
    const res = await POST(createRequest(formData));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("No audio file provided");
  });

  it("returns 413 when audio file exceeds 25MB", async () => {
    const { POST } = await import("@/app/api/fred/whisper/route");
    const largeContent = Buffer.alloc(26 * 1024 * 1024, "a");
    const formData = createAudioFormData(largeContent);
    const res = await POST(createRequest(formData));
    const body = await res.json();

    expect(res.status).toBe(413);
    expect(body.error).toContain("too large");
  });

  it("returns empty text for recordings under 100 bytes", async () => {
    const { POST } = await import("@/app/api/fred/whisper/route");
    const formData = createAudioFormData("tiny"); // < 100 bytes
    const res = await POST(createRequest(formData));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.text).toBe("");
    expect(body.duration).toBe(0);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("transcribes valid audio and returns text, duration, language", async () => {
    mockCreate.mockResolvedValue({
      text: "  Hello world, this is a test.  ",
      duration: 3.5,
      language: "en",
    });

    const { POST } = await import("@/app/api/fred/whisper/route");
    const formData = createAudioFormData();
    const res = await POST(createRequest(formData));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.text).toBe("Hello world, this is a test.");
    expect(body.duration).toBe(3.5);
    expect(body.language).toBe("en");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "whisper-1",
        language: "en",
        response_format: "verbose_json",
      })
    );
  });

  it("handles empty transcription result", async () => {
    mockCreate.mockResolvedValue({
      text: "   ",
      duration: 1.0,
      language: "en",
    });

    const { POST } = await import("@/app/api/fred/whisper/route");
    const formData = createAudioFormData();
    const res = await POST(createRequest(formData));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.text).toBe("");
  });

  it("returns 429 on OpenAI rate limit error", async () => {
    // Import the mocked APIError class
    const { APIError } = await import("openai");
    const rateLimitError = new (APIError as any)(429, {}, "Rate limited", {});
    mockCreate.mockRejectedValue(rateLimitError);

    const { POST } = await import("@/app/api/fred/whisper/route");
    const formData = createAudioFormData();
    const res = await POST(createRequest(formData));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toContain("Too many requests");
  });

  it("returns 500 on general OpenAI failure", async () => {
    mockCreate.mockRejectedValue(new Error("Network timeout"));

    const { POST } = await import("@/app/api/fred/whisper/route");
    const formData = createAudioFormData();
    const res = await POST(createRequest(formData));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to transcribe audio");
  });

  it("handles different audio formats (mp4, ogg, wav)", async () => {
    mockCreate.mockResolvedValue({
      text: "Test transcription",
      duration: 2.0,
      language: "en",
    });

    const { POST } = await import("@/app/api/fred/whisper/route");

    for (const [mime, ext] of [
      ["audio/mp4", "recording.mp4"],
      ["audio/ogg", "recording.ogg"],
      ["audio/wav", "recording.wav"],
    ]) {
      const formData = createAudioFormData(
        "fake audio content that is long enough to pass the minimum 100 byte size check - this needs to be over one hundred bytes of padding data so that the whisper route actually calls OpenAI transcription",
        ext,
        mime
      );
      const res = await POST(createRequest(formData));
      expect(res.status).toBe(200);
    }

    expect(mockCreate).toHaveBeenCalledTimes(3);
  });
});
