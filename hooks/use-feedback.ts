"use client"

import { useState, useCallback, useRef } from "react"
import type {
  FeedbackSignal,
  FeedbackSource,
  MessageFeedbackState,
  SubmitFeedbackRequest,
  SubmitFeedbackResponse,
} from "@/lib/feedback/types"
import {
  MAX_COMMENT_LENGTH,
  FEEDBACK_API_ENDPOINT,
  FEEDBACK_EVENTS,
  FEEDBACK_TOASTS,
} from "@/lib/feedback/constants"
import { trackEvent } from "@/lib/analytics"

// ---------------------------------------------------------------------------
// Hook options
// ---------------------------------------------------------------------------

export interface UseFeedbackOptions {
  /** Chat session ID for context grouping */
  sessionId: string
  /** Source surface where feedback is collected */
  source?: FeedbackSource
  /** Callback fired after successful submission */
  onSuccess?: (messageId: string, signal: FeedbackSignal) => void
  /** Callback fired on submission error */
  onError?: (messageId: string, error: string) => void
}

// ---------------------------------------------------------------------------
// Hook return
// ---------------------------------------------------------------------------

export interface UseFeedbackReturn {
  /** Get the current feedback state for a message */
  getFeedbackState: (messageId: string) => MessageFeedbackState
  /** Submit a thumbs signal for a message */
  submitSignal: (messageId: string, signal: FeedbackSignal) => Promise<void>
  /** Toggle the comment form open/closed for a message */
  toggleComment: (messageId: string) => void
  /** Update the draft comment text for a message */
  setComment: (messageId: string, comment: string) => void
  /** Submit the comment for a message that already has a signal */
  submitComment: (messageId: string) => Promise<void>
}

// ---------------------------------------------------------------------------
// Default state factory
// ---------------------------------------------------------------------------

const DEFAULT_STATE: MessageFeedbackState = {
  signal: null,
  isCommentOpen: false,
  comment: "",
  isSubmitting: false,
  isSubmitted: false,
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function useFeedback(options: UseFeedbackOptions): UseFeedbackReturn {
  const { sessionId, source = "chat", onSuccess, onError } = options

  // Map of messageId -> feedback state
  const [stateMap, setStateMap] = useState<Record<string, MessageFeedbackState>>({})

  // Track submitted feedback IDs so we can update comments on existing records
  const feedbackIdsRef = useRef<Record<string, string>>({})

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const updateState = useCallback(
    (messageId: string, patch: Partial<MessageFeedbackState>) => {
      setStateMap((prev) => ({
        ...prev,
        [messageId]: { ...(prev[messageId] || DEFAULT_STATE), ...patch },
      }))
    },
    []
  )

  const getFeedbackState = useCallback(
    (messageId: string): MessageFeedbackState => {
      return stateMap[messageId] || DEFAULT_STATE
    },
    [stateMap]
  )

  // ---------------------------------------------------------------------------
  // Submit signal (thumbs up / thumbs down)
  // ---------------------------------------------------------------------------

  const submitSignal = useCallback(
    async (messageId: string, signal: FeedbackSignal) => {
      const current = stateMap[messageId] || DEFAULT_STATE

      // If same signal already submitted, ignore (no toggling off)
      if (current.signal === signal && current.isSubmitted) return

      // Track signal change if switching
      if (current.signal && current.signal !== signal) {
        trackEvent(FEEDBACK_EVENTS.SIGNAL_CHANGED, {
          message_id: messageId,
          from: current.signal,
          to: signal,
        })
      }

      updateState(messageId, { signal, isSubmitting: true })

      try {
        const body: SubmitFeedbackRequest = {
          message_id: messageId,
          session_id: sessionId,
          signal,
          source,
        }

        const res = await fetch(FEEDBACK_API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        const data: SubmitFeedbackResponse = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to submit feedback")
        }

        // Store the feedback record ID for comment updates
        if (data.id) {
          feedbackIdsRef.current[messageId] = data.id
        }

        updateState(messageId, {
          isSubmitting: false,
          isSubmitted: true,
        })

        trackEvent(FEEDBACK_EVENTS.SIGNAL_SUBMITTED, {
          message_id: messageId,
          signal,
          source,
        })

        onSuccess?.(messageId, signal)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : FEEDBACK_TOASTS.ERROR
        updateState(messageId, { isSubmitting: false })
        onError?.(messageId, errorMessage)
      }
    },
    [stateMap, sessionId, source, updateState, onSuccess, onError]
  )

  // ---------------------------------------------------------------------------
  // Toggle comment form
  // ---------------------------------------------------------------------------

  const toggleComment = useCallback(
    (messageId: string) => {
      const current = stateMap[messageId] || DEFAULT_STATE
      const opening = !current.isCommentOpen

      updateState(messageId, { isCommentOpen: opening })

      if (opening) {
        trackEvent(FEEDBACK_EVENTS.COMMENT_OPENED, {
          message_id: messageId,
          signal: current.signal,
        })
      }
    },
    [stateMap, updateState]
  )

  // ---------------------------------------------------------------------------
  // Set comment text (with max length enforcement)
  // ---------------------------------------------------------------------------

  const setComment = useCallback(
    (messageId: string, comment: string) => {
      const trimmed = comment.slice(0, MAX_COMMENT_LENGTH)
      updateState(messageId, { comment: trimmed })
    },
    [updateState]
  )

  // ---------------------------------------------------------------------------
  // Submit comment (requires signal already submitted)
  // ---------------------------------------------------------------------------

  const submitComment = useCallback(
    async (messageId: string) => {
      const current = stateMap[messageId] || DEFAULT_STATE
      if (!current.signal || !current.comment.trim()) return

      updateState(messageId, { isSubmitting: true })

      try {
        const body: SubmitFeedbackRequest = {
          message_id: messageId,
          session_id: sessionId,
          signal: current.signal,
          comment: current.comment.trim(),
          source,
        }

        const res = await fetch(FEEDBACK_API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        const data: SubmitFeedbackResponse = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to submit comment")
        }

        updateState(messageId, {
          isSubmitting: false,
          isCommentOpen: false,
        })

        trackEvent(FEEDBACK_EVENTS.COMMENT_SUBMITTED, {
          message_id: messageId,
          signal: current.signal,
          comment_length: current.comment.trim().length,
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : FEEDBACK_TOASTS.ERROR
        updateState(messageId, { isSubmitting: false })
        onError?.(messageId, errorMessage)
      }
    },
    [stateMap, sessionId, source, updateState, onError]
  )

  return {
    getFeedbackState,
    submitSignal,
    toggleComment,
    setComment,
    submitComment,
  }
}
