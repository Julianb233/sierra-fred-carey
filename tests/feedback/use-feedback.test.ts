/**
 * Tests for the useFeedback hook
 * Phase 72-01: Feedback collection hook unit tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useFeedback } from "@/hooks/use-feedback"

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock analytics
vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}))

describe("useFeedback", () => {
  const defaultOptions = {
    sessionId: "test-session-123",
    source: "chat" as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, id: "fb-001" }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns default state for unknown message", () => {
    const { result } = renderHook(() => useFeedback(defaultOptions))

    const state = result.current.getFeedbackState("msg-1")
    expect(state.signal).toBeNull()
    expect(state.isCommentOpen).toBe(false)
    expect(state.comment).toBe("")
    expect(state.isSubmitting).toBe(false)
    expect(state.isSubmitted).toBe(false)
  })

  it("submits thumbs_up signal via fetch", async () => {
    const { result } = renderHook(() => useFeedback(defaultOptions))

    await act(async () => {
      await result.current.submitSignal("msg-1", "thumbs_up")
    })

    expect(mockFetch).toHaveBeenCalledWith("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message_id: "msg-1",
        session_id: "test-session-123",
        signal: "thumbs_up",
        source: "chat",
      }),
    })

    const state = result.current.getFeedbackState("msg-1")
    expect(state.signal).toBe("thumbs_up")
    expect(state.isSubmitted).toBe(true)
    expect(state.isSubmitting).toBe(false)
  })

  it("submits thumbs_down signal via fetch", async () => {
    const { result } = renderHook(() => useFeedback(defaultOptions))

    await act(async () => {
      await result.current.submitSignal("msg-2", "thumbs_down")
    })

    const state = result.current.getFeedbackState("msg-2")
    expect(state.signal).toBe("thumbs_down")
    expect(state.isSubmitted).toBe(true)
  })

  it("calls onSuccess callback after successful submission", async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(() =>
      useFeedback({ ...defaultOptions, onSuccess })
    )

    await act(async () => {
      await result.current.submitSignal("msg-1", "thumbs_up")
    })

    expect(onSuccess).toHaveBeenCalledWith("msg-1", "thumbs_up")
  })

  it("calls onError callback on fetch failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ success: false, error: "Server error" }),
    })

    const onError = vi.fn()
    const { result } = renderHook(() =>
      useFeedback({ ...defaultOptions, onError })
    )

    await act(async () => {
      await result.current.submitSignal("msg-1", "thumbs_up")
    })

    expect(onError).toHaveBeenCalledWith("msg-1", "Server error")
  })

  it("toggles comment form open/closed", () => {
    const { result } = renderHook(() => useFeedback(defaultOptions))

    act(() => {
      result.current.toggleComment("msg-1")
    })

    expect(result.current.getFeedbackState("msg-1").isCommentOpen).toBe(true)

    act(() => {
      result.current.toggleComment("msg-1")
    })

    expect(result.current.getFeedbackState("msg-1").isCommentOpen).toBe(false)
  })

  it("enforces max comment length", () => {
    const { result } = renderHook(() => useFeedback(defaultOptions))

    const longComment = "a".repeat(600)
    act(() => {
      result.current.setComment("msg-1", longComment)
    })

    expect(result.current.getFeedbackState("msg-1").comment.length).toBe(500)
  })

  it("submits comment with signal", async () => {
    const { result } = renderHook(() => useFeedback(defaultOptions))

    // First submit a signal
    await act(async () => {
      await result.current.submitSignal("msg-1", "thumbs_down")
    })

    // Set a comment
    act(() => {
      result.current.setComment("msg-1", "Could be more specific")
    })

    // Submit the comment
    await act(async () => {
      await result.current.submitComment("msg-1")
    })

    // Second call should include the comment
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const secondCall = JSON.parse(mockFetch.mock.calls[1][1].body)
    expect(secondCall.comment).toBe("Could be more specific")
    expect(secondCall.signal).toBe("thumbs_down")
  })

  it("does not submit comment without signal", async () => {
    const { result } = renderHook(() => useFeedback(defaultOptions))

    act(() => {
      result.current.setComment("msg-1", "Some comment")
    })

    await act(async () => {
      await result.current.submitComment("msg-1")
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("does not submit empty comment", async () => {
    const { result } = renderHook(() => useFeedback(defaultOptions))

    await act(async () => {
      await result.current.submitSignal("msg-1", "thumbs_up")
    })

    mockFetch.mockClear()

    await act(async () => {
      await result.current.submitComment("msg-1")
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("ignores duplicate signal submission", async () => {
    const { result } = renderHook(() => useFeedback(defaultOptions))

    await act(async () => {
      await result.current.submitSignal("msg-1", "thumbs_up")
    })

    mockFetch.mockClear()

    await act(async () => {
      await result.current.submitSignal("msg-1", "thumbs_up")
    })

    // Should not make a second API call for same signal
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("tracks independent state per message", async () => {
    const { result } = renderHook(() => useFeedback(defaultOptions))

    await act(async () => {
      await result.current.submitSignal("msg-1", "thumbs_up")
    })

    await act(async () => {
      await result.current.submitSignal("msg-2", "thumbs_down")
    })

    expect(result.current.getFeedbackState("msg-1").signal).toBe("thumbs_up")
    expect(result.current.getFeedbackState("msg-2").signal).toBe("thumbs_down")
  })
})
