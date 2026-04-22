/**
 * Tests for useWhisperFlow hook
 *
 * Validates the Whisper Flow voice-to-text integration:
 * - MediaRecorder setup and audio capture
 * - Transcription via /api/fred/whisper
 * - Audio level monitoring
 * - Error handling (permission denied, transcription failures)
 * - Recording lifecycle (start, stop, toggle, reset)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWhisperFlow } from "../use-whisper-flow";

// ============================================================================
// Mocks
// ============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock MediaRecorder
class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  state = "inactive" as "inactive" | "recording" | "paused";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  start = vi.fn(() => {
    this.state = "recording";
  });
  stop = vi.fn(() => {
    this.state = "inactive";
    // Simulate data available then stop
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(["x".repeat(200)], { type: "audio/webm" }) });
    }
    if (this.onstop) {
      this.onstop();
    }
  });
  pause = vi.fn();
  resume = vi.fn();
}

// Mock getUserMedia
const mockStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }]),
};

const mockGetUserMedia = vi.fn(() => Promise.resolve(mockStream));

// Mock AudioContext for audio level monitoring
const mockAnalyser = {
  fftSize: 256,
  frequencyBinCount: 128,
  getByteFrequencyData: vi.fn((arr: Uint8Array) => {
    // Fill with some mock audio data
    for (let i = 0; i < arr.length; i++) {
      arr[i] = 64;
    }
  }),
};

const mockAudioContext = {
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
  })),
  createAnalyser: vi.fn(() => mockAnalyser),
};

// Set up globals
vi.stubGlobal("MediaRecorder", MockMediaRecorder);
vi.stubGlobal("AudioContext", vi.fn(() => mockAudioContext));

Object.defineProperty(navigator, "mediaDevices", {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
});

// Mock requestAnimationFrame
vi.stubGlobal("requestAnimationFrame", vi.fn((cb: () => void) => {
  // Don't actually call to prevent infinite loops
  return 1;
}));
vi.stubGlobal("cancelAnimationFrame", vi.fn());

// ============================================================================
// Tests
// ============================================================================

describe("useWhisperFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch.mockReset();
    mockGetUserMedia.mockResolvedValue(mockStream);
    mockStream.getTracks.mockReturnValue([{ stop: vi.fn() }]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("reports isSupported when MediaRecorder and getUserMedia are available", () => {
      const { result } = renderHook(() => useWhisperFlow());
      expect(result.current.isSupported).toBe(true);
    });

    it("starts in idle state", () => {
      const { result } = renderHook(() => useWhisperFlow());
      expect(result.current.isRecording).toBe(false);
      expect(result.current.isTranscribing).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.transcript).toBe("");
      expect(result.current.error).toBeNull();
      expect(result.current.duration).toBe(0);
      expect(result.current.audioLevel).toBe(0);
    });
  });

  describe("recording lifecycle", () => {
    it("starts recording when startRecording is called", async () => {
      const { result } = renderHook(() => useWhisperFlow());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: expect.objectContaining({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }),
      });
    });

    it("stops recording when stopRecording is called", async () => {
      const mockTranscription = { text: "Hello Fred", duration: 2.5, language: "en" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTranscription),
      });

      const { result } = renderHook(() => useWhisperFlow());

      await act(async () => {
        await result.current.startRecording();
      });
      expect(result.current.isRecording).toBe(true);

      await act(async () => {
        result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);
    });

    it("toggles recording state", async () => {
      const mockTranscription = { text: "test", duration: 1, language: "en" };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTranscription),
      });

      const { result } = renderHook(() => useWhisperFlow());

      // Toggle on
      await act(async () => {
        result.current.toggleRecording();
      });
      expect(result.current.isRecording).toBe(true);

      // Toggle off
      await act(async () => {
        result.current.toggleRecording();
      });
      expect(result.current.isRecording).toBe(false);
    });

    it("resets state when reset is called", async () => {
      const { result } = renderHook(() => useWhisperFlow());

      await act(async () => {
        result.current.reset();
      });

      expect(result.current.transcript).toBe("");
      expect(result.current.error).toBeNull();
      expect(result.current.duration).toBe(0);
      expect(result.current.audioLevel).toBe(0);
    });
  });

  describe("transcription", () => {
    it("calls /api/fred/whisper with audio blob after recording stops", async () => {
      const mockTranscription = { text: "Help me with fundraising", duration: 3.2, language: "en" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTranscription),
      });

      const onTranscript = vi.fn();
      const { result } = renderHook(() =>
        useWhisperFlow({ onTranscript })
      );

      await act(async () => {
        await result.current.startRecording();
      });
      await act(async () => {
        result.current.stopRecording();
      });

      // Wait for transcription
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/fred/whisper", {
          method: "POST",
          body: expect.any(FormData),
        });
      });
    });

    it("calls onTranscript callback with transcribed text", async () => {
      const mockTranscription = { text: "What should I focus on?", duration: 2.1, language: "en" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTranscription),
      });

      const onTranscript = vi.fn();
      const { result } = renderHook(() =>
        useWhisperFlow({ onTranscript })
      );

      await act(async () => {
        await result.current.startRecording();
      });
      await act(async () => {
        result.current.stopRecording();
      });

      await vi.waitFor(() => {
        expect(onTranscript).toHaveBeenCalledWith("What should I focus on?");
      });
    });
  });

  describe("error handling", () => {
    it("handles microphone permission denied", async () => {
      const permError = new DOMException("Permission denied", "NotAllowedError");
      mockGetUserMedia.mockRejectedValueOnce(permError);

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useWhisperFlow({ onError })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toContain("Microphone permission denied");
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining("Microphone permission denied")
      );
    });

    it("handles transcription API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Transcription service error" }),
      });

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useWhisperFlow({ onError })
      );

      await act(async () => {
        await result.current.startRecording();
      });
      await act(async () => {
        result.current.stopRecording();
      });

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith("Transcription service error");
      });
    });

    it("handles rate limiting (429)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: "Too many requests" }),
      });

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useWhisperFlow({ onError })
      );

      await act(async () => {
        await result.current.startRecording();
      });
      await act(async () => {
        result.current.stopRecording();
      });

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith("Too many requests");
      });
    });

    it("handles generic device access failure", async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error("Device not found"));

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useWhisperFlow({ onError })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toContain("Could not access microphone");
    });
  });

  describe("isProcessing composite state", () => {
    it("is true when recording", async () => {
      const { result } = renderHook(() => useWhisperFlow());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isProcessing).toBe(true);
      expect(result.current.isRecording).toBe(true);
    });

    it("is false when idle", () => {
      const { result } = renderHook(() => useWhisperFlow());
      expect(result.current.isProcessing).toBe(false);
    });
  });
});
