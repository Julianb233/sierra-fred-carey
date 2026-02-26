/**
 * Tests for useFredChat hook
 *
 * Tests the FRED chat integration hook functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFredChat, type FredState } from "../use-fred-chat";

// Mock fetch for SSE testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID
const mockUUID = "test-session-uuid";
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => mockUUID),
});

// Mock sessionStorage
const mockSessionStorage: Record<string, string> = {};
vi.stubGlobal("sessionStorage", {
  getItem: (key: string) => mockSessionStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockSessionStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockSessionStorage[key];
  },
  clear: () => {
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
  },
});

describe("useFredChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with empty messages", () => {
      const { result } = renderHook(() => useFredChat());

      expect(result.current.messages).toEqual([]);
      expect(result.current.state).toBe("idle");
      expect(result.current.isProcessing).toBe(false);
    });

    it("should generate session ID if not provided", () => {
      const { result } = renderHook(() => useFredChat());

      expect(result.current.sessionId).toBe(mockUUID);
    });

    it("should use provided session ID", () => {
      const customSessionId = "custom-session-id";
      const { result } = renderHook(() =>
        useFredChat({ sessionId: customSessionId })
      );

      expect(result.current.sessionId).toBe(customSessionId);
    });

    it("should start with no analysis or synthesis", () => {
      const { result } = renderHook(() => useFredChat());

      expect(result.current.analysis).toBeNull();
      expect(result.current.synthesis).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe("State Tracking", () => {
    it("should identify processing states correctly", () => {
      const { result, rerender } = renderHook(() => useFredChat());

      // Idle should not be processing
      expect(result.current.isProcessing).toBe(false);
    });

    it("should call onStateChange callback when state changes", async () => {
      const onStateChange = vi.fn();

      // Mock a simple non-streaming response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            sessionId: mockUUID,
            response: {
              content: "Test response",
              action: "recommend",
              confidence: 0.8,
            },
          }),
      });

      const { result } = renderHook(() =>
        useFredChat({ onStateChange })
      );

      // Initial state change to idle should be called
      expect(onStateChange).toHaveBeenCalledWith("idle");
    });
  });

  describe("Message Handling", () => {
    it("should add user message immediately when sending", async () => {
      // Mock fetch to return a response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  'event: connected\ndata: {"sessionId":"test"}\n\n'
                ),
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  'event: response\ndata: {"content":"Hello!","confidence":0.9}\n\n'
                ),
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  'event: done\ndata: {"sessionId":"test"}\n\n'
                ),
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      });

      const { result } = renderHook(() => useFredChat());

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      // Should have user message
      expect(result.current.messages.length).toBeGreaterThanOrEqual(1);
      expect(result.current.messages[0].role).toBe("user");
      expect(result.current.messages[0].content).toBe("Hello");
    });
  });

  describe("Error Handling", () => {
    it("should set error state on fetch failure", async () => {
      // Hook retries once on failure — mock both attempts
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useFredChat());

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.state).toBe("error");
    });

    it("should clear error when clearError is called", async () => {
      // Hook retries once on failure — mock both attempts
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useFredChat());

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      expect(result.current.error).toBe("Network error");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.state).toBe("idle");
    });

    it("should add error message when fetch fails", async () => {
      // Hook retries once on failure — mock both attempts
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useFredChat());

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      // Should have user message and error response
      expect(result.current.messages.length).toBe(2);
      expect(result.current.messages[1].role).toBe("assistant");
      expect(result.current.messages[1].confidence).toBe("low");
    });
  });

  describe("Reset Functionality", () => {
    it("should clear all state when reset is called", async () => {
      // Hook retries once on failure — mock both attempts
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useFredChat());

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      expect(result.current.messages.length).toBeGreaterThan(0);

      act(() => {
        result.current.reset();
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.state).toBe("idle");
      expect(result.current.analysis).toBeNull();
      expect(result.current.synthesis).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe("HTTP Error Handling", () => {
    it("should handle HTTP error responses", async () => {
      // Hook retries once on failure — mock both attempts
      const errorResponse = {
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      };
      mockFetch.mockResolvedValueOnce(errorResponse);
      mockFetch.mockResolvedValueOnce(errorResponse);

      const { result } = renderHook(() => useFredChat());

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      expect(result.current.error).toBe("Server error");
      expect(result.current.state).toBe("error");
    });

    it("should handle rate limit errors", async () => {
      // Hook retries once on failure — mock both attempts
      const rateLimitResponse = {
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: "Rate limit exceeded" }),
      };
      mockFetch.mockResolvedValueOnce(rateLimitResponse);
      mockFetch.mockResolvedValueOnce(rateLimitResponse);

      const { result } = renderHook(() => useFredChat());

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      expect(result.current.error).toBe("Rate limit exceeded");
    });
  });
});

describe("FredState Types", () => {
  it("should have all expected states defined", () => {
    const states: FredState[] = [
      "idle",
      "connecting",
      "analyzing",
      "applying_models",
      "synthesizing",
      "deciding",
      "complete",
      "error",
    ];

    // Type check - this will fail compilation if types are wrong
    expect(states).toHaveLength(8);
  });
});
