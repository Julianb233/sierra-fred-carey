import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useWhisperFlow } from "../use-whisper-flow";

// Generate a chunk large enough to pass the blob.size > 100 check in the hook
const FAKE_AUDIO_DATA = "x".repeat(200);

// Mock MediaRecorder
class MockMediaRecorder {
  state = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    // Simulate data available — must be > 100 bytes to trigger transcription
    this.ondataavailable?.({ data: new Blob([FAKE_AUDIO_DATA], { type: "audio/webm" }) });
    this.onstop?.();
  }

  static isTypeSupported(type: string) {
    return type === "audio/webm;codecs=opus" || type === "audio/webm";
  }
}

// Mock getUserMedia
const mockGetUserMedia = vi.fn();
const mockTrackStop = vi.fn();

function createMockStream(): MediaStream {
  return {
    getTracks: () => [{ stop: mockTrackStop, kind: "audio" }],
  } as unknown as MediaStream;
}

// Mock AudioContext for level monitoring
const mockAnalyser = {
  fftSize: 0,
  frequencyBinCount: 128,
  getByteFrequencyData: vi.fn((arr: Uint8Array) => arr.fill(64)),
};

class MockAudioContext {
  createMediaStreamSource() {
    return { connect: vi.fn() };
  }
  createAnalyser() {
    return mockAnalyser;
  }
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });

  // Set up global mocks
  Object.defineProperty(global, "MediaRecorder", {
    value: MockMediaRecorder,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(global, "AudioContext", {
    value: MockAudioContext,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(global.navigator, "mediaDevices", {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true,
  });

  mockGetUserMedia.mockResolvedValue(createMockStream());

  // Mock fetch for /api/fred/whisper
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ text: "Hello Fred", duration: 2.5, language: "en" }),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useWhisperFlow", () => {
  it("initializes with correct default state", () => {
    const { result } = renderHook(() => useWhisperFlow());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.isTranscribing).toBe(false);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.transcript).toBe("");
    expect(result.current.error).toBeNull();
    expect(result.current.duration).toBe(0);
    expect(result.current.audioLevel).toBe(0);
  });

  it("detects browser support correctly", () => {
    const { result } = renderHook(() => useWhisperFlow());
    expect(result.current.isSupported).toBe(true);
  });

  it("detects unsupported browser when MediaRecorder is missing", () => {
    const original = global.MediaRecorder;
    // @ts-expect-error - intentionally removing for test
    delete global.MediaRecorder;

    const { result } = renderHook(() => useWhisperFlow());
    expect(result.current.isSupported).toBe(false);

    Object.defineProperty(global, "MediaRecorder", {
      value: original,
      writable: true,
      configurable: true,
    });
  });

  it("starts recording and sets isRecording to true", async () => {
    const { result } = renderHook(() => useWhisperFlow());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(mockGetUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
      },
    });
  });

  it("stops recording and triggers transcription", async () => {
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useWhisperFlow({ onTranscript }));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);

    act(() => {
      result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);

    await waitFor(() => {
      expect(result.current.isTranscribing).toBe(false);
    });

    expect(result.current.transcript).toBe("Hello Fred");
    expect(onTranscript).toHaveBeenCalledWith("Hello Fred");
  });

  it("toggleRecording starts then stops", async () => {
    const { result } = renderHook(() => useWhisperFlow());

    // Start
    await act(async () => {
      result.current.toggleRecording();
    });
    // Wait for the async startRecording to complete
    await waitFor(() => {
      expect(result.current.isRecording).toBe(true);
    });

    // Stop
    act(() => {
      result.current.toggleRecording();
    });
    expect(result.current.isRecording).toBe(false);
  });

  it("handles microphone permission denied", async () => {
    const onError = vi.fn();
    mockGetUserMedia.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError")
    );

    const { result } = renderHook(() => useWhisperFlow({ onError }));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toContain("Microphone permission denied");
    expect(onError).toHaveBeenCalledWith(expect.stringContaining("Microphone permission denied"));
    expect(result.current.isRecording).toBe(false);
  });

  it("handles generic microphone errors", async () => {
    const onError = vi.fn();
    mockGetUserMedia.mockRejectedValueOnce(new Error("Device not found"));

    const { result } = renderHook(() => useWhisperFlow({ onError }));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toContain("Could not access microphone");
    expect(onError).toHaveBeenCalled();
  });

  it("handles transcription API failure", async () => {
    const onError = vi.fn();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal server error" }),
    });

    const { result } = renderHook(() => useWhisperFlow({ onError }));

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(result.current.isTranscribing).toBe(false);
    });

    expect(result.current.error).toBe("Internal server error");
    expect(onError).toHaveBeenCalledWith("Internal server error");
  });

  it("handles rate limiting (429)", async () => {
    const onError = vi.fn();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: "Rate limited" }),
    });

    const { result } = renderHook(() => useWhisperFlow({ onError }));

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Rate limited");
    });
  });

  it("resets state correctly", async () => {
    const { result } = renderHook(() => useWhisperFlow());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(result.current.transcript).toBe("Hello Fred");
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.transcript).toBe("");
    expect(result.current.error).toBeNull();
    expect(result.current.duration).toBe(0);
    expect(result.current.audioLevel).toBe(0);
  });

  it("reports isProcessing during recording and transcription", async () => {
    const { result } = renderHook(() => useWhisperFlow());

    expect(result.current.isProcessing).toBe(false);

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isProcessing).toBe(true);

    act(() => {
      result.current.stopRecording();
    });

    // Should still be processing during transcription
    // Wait for transcription to complete
    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false);
    });
  });

  it("sends audio to /api/fred/whisper with correct format", async () => {
    const { result } = renderHook(() => useWhisperFlow());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(result.current.isTranscribing).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/fred/whisper", {
      method: "POST",
      body: expect.any(FormData),
    });
  });

  it("calls onTranscript callback with empty text for silent recordings", async () => {
    const onTranscript = vi.fn();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: "", duration: 0.5, language: "en" }),
    });

    const { result } = renderHook(() => useWhisperFlow({ onTranscript }));

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(result.current.isTranscribing).toBe(false);
    });

    // onTranscript should NOT be called for empty text
    expect(onTranscript).not.toHaveBeenCalled();
    expect(result.current.transcript).toBe("");
  });
});
