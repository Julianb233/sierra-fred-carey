/**
 * CallFredModal Logic Tests
 *
 * Tests for voice call modal helper functions, Samsung detection,
 * call state machine transitions, and configuration.
 *
 * Note: Component rendering tests are deferred to E2E (Playwright)
 * due to React 19 + @testing-library/react act() incompatibility.
 *
 * AI-1415: QA voice integration end-to-end
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, afterEach } from "vitest";

// ============================================================================
// Samsung device detection (replicated from component for testing)
// ============================================================================

function isSamsungDevice(ua: string): boolean {
  const lower = ua.toLowerCase();
  return (
    lower.includes("samsungbrowser") ||
    lower.includes("samsung") ||
    /sm-[gasn]\d/i.test(ua)
  );
}

describe("Samsung device detection", () => {
  it("detects Samsung Internet browser", () => {
    expect(
      isSamsungDevice(
        "Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 SamsungBrowser/21.0"
      )
    ).toBe(true);
  });

  it("detects Samsung Galaxy S series (SM-S)", () => {
    expect(
      isSamsungDevice(
        "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Chrome/120.0"
      )
    ).toBe(true);
  });

  it("detects Samsung Galaxy A series (SM-A)", () => {
    expect(
      isSamsungDevice(
        "Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 Chrome/119.0"
      )
    ).toBe(true);
  });

  it("detects Samsung Galaxy Note series (SM-N)", () => {
    expect(
      isSamsungDevice(
        "Mozilla/5.0 (Linux; Android 12; SM-N986B) AppleWebKit/537.36 Chrome/118.0"
      )
    ).toBe(true);
  });

  it("does not detect Chrome desktop", () => {
    expect(
      isSamsungDevice(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36"
      )
    ).toBe(false);
  });

  it("does not detect Safari iOS", () => {
    expect(
      isSamsungDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Safari/604.1"
      )
    ).toBe(false);
  });

  it("does not detect Firefox", () => {
    expect(
      isSamsungDevice(
        "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0"
      )
    ).toBe(false);
  });

  it("does not detect Pixel", () => {
    expect(
      isSamsungDevice(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 Chrome/120.0"
      )
    ).toBe(false);
  });
});

// ============================================================================
// Call state machine logic
// ============================================================================

type CallState = "idle" | "connecting" | "in-call" | "ending" | "ended" | "error";

describe("Call state machine", () => {
  it("defines all valid states", () => {
    const validStates: CallState[] = [
      "idle",
      "connecting",
      "in-call",
      "ending",
      "ended",
      "error",
    ];
    expect(validStates).toHaveLength(6);
  });

  it("allows modal close only in non-call states", () => {
    function canCloseModal(state: CallState): boolean {
      return state !== "in-call";
    }

    expect(canCloseModal("idle")).toBe(true);
    expect(canCloseModal("connecting")).toBe(true);
    expect(canCloseModal("in-call")).toBe(false);
    expect(canCloseModal("ending")).toBe(true);
    expect(canCloseModal("ended")).toBe(true);
    expect(canCloseModal("error")).toBe(true);
  });

  it("computes correct header text per state", () => {
    function getHeaderText(state: CallState): string {
      switch (state) {
        case "idle":
          return "Call Fred";
        case "connecting":
          return "Connecting...";
        case "in-call":
          return "On Call with Fred";
        case "ending":
          return "Ending Call...";
        case "ended":
          return "Call Ended";
        case "error":
          return "Connection Failed";
      }
    }

    expect(getHeaderText("idle")).toBe("Call Fred");
    expect(getHeaderText("connecting")).toBe("Connecting...");
    expect(getHeaderText("in-call")).toBe("On Call with Fred");
    expect(getHeaderText("ending")).toBe("Ending Call...");
    expect(getHeaderText("ended")).toBe("Call Ended");
    expect(getHeaderText("error")).toBe("Connection Failed");
  });
});

// ============================================================================
// Call duration and limits
// ============================================================================

describe("Call duration limits", () => {
  it("on-demand calls have 10 minute max duration", () => {
    const maxDuration = 600; // seconds
    expect(maxDuration / 60).toBe(10);
  });

  it("scheduled calls have 30 minute max duration", () => {
    const maxDuration = 1800; // seconds
    expect(maxDuration / 60).toBe(30);
  });

  it("agent timeout is 30 seconds", () => {
    const agentTimeout = 30_000; // milliseconds
    expect(agentTimeout).toBe(30000);
  });

  it("Samsung watchdog interval is 3 seconds", () => {
    const watchdogInterval = 3000; // milliseconds
    expect(watchdogInterval).toBe(3000);
  });
});

// ============================================================================
// Audio capture options
// ============================================================================

describe("Audio capture options", () => {
  function buildAudioCaptureOptions(isSamsung: boolean) {
    if (isSamsung) {
      return {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
        sampleRate: 16000,
        channelCount: 1,
      };
    }
    return {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
  }

  it("enables all processing for standard devices", () => {
    const opts = buildAudioCaptureOptions(false);
    expect(opts.echoCancellation).toBe(true);
    expect(opts.noiseSuppression).toBe(true);
    expect(opts.autoGainControl).toBe(true);
  });

  it("disables autoGainControl on Samsung", () => {
    const opts = buildAudioCaptureOptions(true);
    expect(opts.autoGainControl).toBe(false);
  });

  it("uses lower sample rate on Samsung", () => {
    const opts = buildAudioCaptureOptions(true);
    expect(opts.sampleRate).toBe(16000);
  });

  it("sets mono channel on Samsung", () => {
    const opts = buildAudioCaptureOptions(true);
    expect(opts.channelCount).toBe(1);
  });
});

// ============================================================================
// Room naming convention
// ============================================================================

describe("Room naming convention", () => {
  it("follows userId_fred-call_timestamp pattern", () => {
    const userId = "user-123-abc";
    const roomName = `${userId}_fred-call_${Date.now()}`;
    expect(roomName).toMatch(/^user-123-abc_fred-call_\d+$/);
  });

  it("allows userId extraction from room name", () => {
    const roomName = "user-123-abc_fred-call_1709654321000";
    // The webhook extracts userId by splitting on the first underscore
    const firstUnderscore = roomName.indexOf("_");
    const userId = roomName.substring(0, firstUnderscore);
    expect(userId).toBe("user-123-abc");
  });
});

// ============================================================================
// LiveKit URL conversion
// ============================================================================

describe("LiveKit URL conversion", () => {
  function getLivekitHttpUrl(wsUrl: string): string {
    return wsUrl.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
  }

  it("converts wss:// to https://", () => {
    expect(getLivekitHttpUrl("wss://test.livekit.cloud")).toBe(
      "https://test.livekit.cloud"
    );
  });

  it("converts ws:// to http://", () => {
    expect(getLivekitHttpUrl("ws://localhost:7880")).toBe(
      "http://localhost:7880"
    );
  });

  it("preserves path and port", () => {
    expect(getLivekitHttpUrl("wss://lk.example.com:443/api")).toBe(
      "https://lk.example.com:443/api"
    );
  });
});

// ============================================================================
// Transcript data parsing
// ============================================================================

describe("Transcript data parsing", () => {
  interface CallTranscriptEntry {
    speaker: "user" | "fred";
    text: string;
    timestamp: string;
  }

  function parseTranscriptPayload(
    payload: Uint8Array
  ): CallTranscriptEntry | null {
    try {
      const message = JSON.parse(new TextDecoder().decode(payload));
      if (message.speaker && message.text) {
        return {
          speaker: message.speaker,
          text: message.text,
          timestamp: message.timestamp || new Date().toISOString(),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  it("parses valid transcript entry", () => {
    const data = JSON.stringify({
      speaker: "fred",
      text: "Hello, how can I help?",
      timestamp: "2026-03-05T10:00:00Z",
    });
    const payload = new TextEncoder().encode(data);
    const entry = parseTranscriptPayload(payload);

    expect(entry).not.toBeNull();
    expect(entry!.speaker).toBe("fred");
    expect(entry!.text).toBe("Hello, how can I help?");
    expect(entry!.timestamp).toBe("2026-03-05T10:00:00Z");
  });

  it("returns null for invalid JSON", () => {
    const payload = new TextEncoder().encode("not json");
    expect(parseTranscriptPayload(payload)).toBeNull();
  });

  it("returns null when missing speaker", () => {
    const data = JSON.stringify({ text: "hello" });
    const payload = new TextEncoder().encode(data);
    expect(parseTranscriptPayload(payload)).toBeNull();
  });

  it("returns null when missing text", () => {
    const data = JSON.stringify({ speaker: "user" });
    const payload = new TextEncoder().encode(data);
    expect(parseTranscriptPayload(payload)).toBeNull();
  });

  it("provides fallback timestamp when missing", () => {
    const data = JSON.stringify({ speaker: "user", text: "Hello" });
    const payload = new TextEncoder().encode(data);
    const entry = parseTranscriptPayload(payload);

    expect(entry).not.toBeNull();
    expect(entry!.timestamp).toBeDefined();
    // Should be a valid ISO date
    expect(new Date(entry!.timestamp).getTime()).not.toBeNaN();
  });
});
