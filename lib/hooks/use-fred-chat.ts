"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { RedFlag, BurnoutSignals } from "@/lib/fred/types";

// ============================================================================
// Types
// ============================================================================

export type FredState =
  | "idle"
  | "connecting"
  | "analyzing"
  | "applying_models"
  | "synthesizing"
  | "deciding"
  | "complete"
  | "error";

export interface FredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  /** Confidence level for assistant messages */
  confidence?: "high" | "medium" | "low";
  /** Suggested action for assistant messages */
  action?: string;
  /** Whether action requires user approval */
  requiresApproval?: boolean;
  /** Reasoning behind the response */
  reasoning?: string;
  /** Whether this message is currently being streamed */
  isStreaming?: boolean;
  /** Course recommendations from FRED's content-recommender tool */
  courses?: Array<{
    id: string;
    title: string;
    description: string;
    slug: string;
    tier_required: string;
    stage?: string;
  }>;
}

export interface FredAnalysis {
  intent: string;
  confidence: number;
  entities?: Record<string, unknown>;
}

export interface FredSynthesis {
  recommendation: string;
  confidence: number;
  reasoning?: string;
}

export interface UseFredChatOptions {
  /** Initial session ID (will generate one if not provided) */
  sessionId?: string;
  /** Startup context to include with messages */
  context?: {
    startupName?: string;
    stage?: string;
    industry?: string;
    goals?: string[];
  };
  /** Whether to store messages in FRED's memory */
  storeInMemory?: boolean;
  /** Current page path so FRED can provide navigation-aware guidance */
  pageContext?: string;
  /** Callback when state changes */
  onStateChange?: (state: FredState) => void;
  /** Callback when analysis is received */
  onAnalysis?: (analysis: FredAnalysis) => void;
  /** Callback when synthesis is received */
  onSynthesis?: (synthesis: FredSynthesis) => void;
}

export interface UseFredChatReturn {
  /** All messages in the conversation */
  messages: FredMessage[];
  /** Send a message to FRED */
  sendMessage: (content: string) => Promise<void>;
  /** Current processing state */
  state: FredState;
  /** Whether FRED is currently processing */
  isProcessing: boolean;
  /** Current session ID */
  sessionId: string;
  /** Latest analysis (intent detection) */
  analysis: FredAnalysis | null;
  /** Latest synthesis */
  synthesis: FredSynthesis | null;
  /** Any error that occurred */
  error: string | null;
  /** Clear the error */
  clearError: () => void;
  /** Reset the conversation */
  reset: () => void;
  /** Detected red flags from conversation */
  redFlags: RedFlag[];
  /** Burnout signals detected from chat messages */
  wellbeingAlert: BurnoutSignals | null;
  /** Dismiss the wellbeing alert */
  dismissWellbeingAlert: () => void;
}

// ============================================================================
// State Mapping
// ============================================================================

const STATE_MAP: Record<string, FredState> = {
  "idle": "idle",
  "INTAKE": "analyzing",
  "VALIDATION": "analyzing",
  "MENTAL_MODELS": "applying_models",
  "SYNTHESIS": "synthesizing",
  "DECIDE": "deciding",
  "EXECUTE": "deciding",
  "complete": "complete",
  "COMPLETE": "complete",
};

function mapState(serverState: string): FredState {
  return STATE_MAP[serverState] || "analyzing";
}

// ============================================================================
// Session ID Management
// ============================================================================

const SESSION_STORAGE_KEY = "fred-session-id";
const MESSAGES_STORAGE_KEY = "fred-chat-messages";

function getOrCreateSessionId(providedId?: string): string {
  // Use provided ID if given
  if (providedId) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_STORAGE_KEY, providedId);
    }
    return providedId;
  }

  // Try to get from session storage
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) return stored;
  }

  // Generate new UUID
  const newId = crypto.randomUUID();
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SESSION_STORAGE_KEY, newId);
  }
  return newId;
}

// ============================================================================
// Message Persistence (survives navigation between widget ↔ /chat)
// ============================================================================

function loadPersistedMessages(): FredMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(MESSAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<FredMessage & { timestamp: string }>;
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [];
  }
}

function persistMessages(messages: FredMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // sessionStorage full — silently ignore
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useFredChat(options: UseFredChatOptions = {}): UseFredChatReturn {
  const {
    sessionId: providedSessionId,
    context,
    storeInMemory = true,
    pageContext,
    onStateChange,
    onAnalysis,
    onSynthesis,
  } = options;

  // State — hydrate messages from sessionStorage so they survive navigation
  const [messages, setMessages] = useState<FredMessage[]>(loadPersistedMessages);
  const [state, setState] = useState<FredState>("idle");
  const [analysis, setAnalysis] = useState<FredAnalysis | null>(null);
  const [synthesis, setSynthesis] = useState<FredSynthesis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redFlags, setRedFlags] = useState<RedFlag[]>([]);
  const [wellbeingAlert, setWellbeingAlert] = useState<BurnoutSignals | null>(null);

  const sessionIdRef = useRef<string>(getOrCreateSessionId(providedSessionId));
  const [sessionIdState, setSessionIdState] = useState<string>(() => sessionIdRef.current);
  const abortControllerRef = useRef<AbortController | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const streamingMessageIdRef = useRef<string | null>(null);
  /** Pending courses from tool results, attached to the next assistant message */
  const pendingCoursesRef = useRef<FredMessage["courses"]>(undefined);

  // Track mounted state for safe state updates after async operations
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Persist messages to sessionStorage on every change
  useEffect(() => {
    persistMessages(messages);
  }, [messages]);

  // Notify on state change
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Notify on analysis
  useEffect(() => {
    if (analysis) {
      onAnalysis?.(analysis);
    }
  }, [analysis, onAnalysis]);

  // Notify on synthesis
  useEffect(() => {
    if (synthesis) {
      onSynthesis?.(synthesis);
    }
  }, [synthesis, onSynthesis]);

  // Send message with streaming
  const sendMessage = useCallback(async (content: string) => {
    // Abort any in-flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Add user message immediately
    const userMessage: FredMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Reset state
    setState("connecting");
    setAnalysis(null);
    setSynthesis(null);
    setError(null);
    streamingMessageIdRef.current = null;
    pendingCoursesRef.current = undefined;

    /**
     * Core streaming logic extracted so we can retry once on transient failures.
     * Throws on any error (fetch failure, interrupted stream, SSE error event).
     * On success, updates all React state (messages, analysis, synthesis, etc.).
     */
    const attemptStream = async (signal: AbortSignal): Promise<void> => {
      const response = await fetch("/api/fred/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          context,
          sessionId: sessionIdRef.current,
          stream: true,
          storeInMemory,
          pageContext,
        }),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let receivedDone = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("event:")) continue;

            const eventMatch = line.match(/^event: (\w+)/);
            const dataMatch = line.match(/data: (.+)/);

            if (!eventMatch || !dataMatch) continue;

            const eventType = eventMatch[1];
            let data: unknown;
            try {
              data = JSON.parse(dataMatch[1]);
            } catch {
              continue;
            }

            // Handle different event types
            switch (eventType) {
              case "connected": {
                const connData = data as { sessionId?: string };
                if (connData.sessionId && connData.sessionId !== sessionIdRef.current) {
                  sessionIdRef.current = connData.sessionId;
                  setSessionIdState(connData.sessionId);
                  sessionStorage.setItem(SESSION_STORAGE_KEY, connData.sessionId);
                }
                if (mountedRef.current) setState("analyzing");
                break;
              }

              case "state": {
                const stateData = data as { state: string; isComplete: boolean };
                if (mountedRef.current) setState(mapState(stateData.state));
                break;
              }

              case "analysis": {
                const analysisData = data as FredAnalysis;
                if (mountedRef.current) setAnalysis(analysisData);
                break;
              }

              case "models":
                // Only advance state forward (never regress past applying_models)
                if (mountedRef.current) {
                  setState(prev => {
                    const order: FredState[] = ["idle", "connecting", "analyzing", "applying_models", "synthesizing", "deciding", "complete"];
                    return order.indexOf(prev) < order.indexOf("applying_models") ? "applying_models" : prev;
                  });
                }
                break;

              case "synthesis": {
                const synthesisData = data as FredSynthesis;
                if (mountedRef.current) {
                  setSynthesis(synthesisData);
                  // Only advance state forward (never regress past synthesizing)
                  setState(prev => {
                    const order: FredState[] = ["idle", "connecting", "analyzing", "applying_models", "synthesizing", "deciding", "complete"];
                    return order.indexOf(prev) < order.indexOf("synthesizing") ? "synthesizing" : prev;
                  });
                }
                break;
              }

              case "red_flag": {
                const rfData = data as { type: string; flags: RedFlag[] };
                if (mountedRef.current && rfData.flags && rfData.flags.length > 0) {
                  setRedFlags(prev => [...prev, ...rfData.flags]);
                }
                break;
              }

              case "wellbeing": {
                const wellbeingData = data as { signals: BurnoutSignals };
                if (mountedRef.current && wellbeingData.signals?.detected) {
                  setWellbeingAlert(wellbeingData.signals);
                }
                break;
              }

              case "tool_result": {
                // Detect recommendContent tool results and stage courses for the next assistant message
                const toolResultData = data as {
                  toolName?: string;
                  result?: {
                    status?: string;
                    courses?: Array<{
                      id: string;
                      title: string;
                      description: string;
                      slug: string;
                      tier_required: string;
                      stage?: string;
                    }>;
                  };
                };
                if (
                  toolResultData.toolName === "recommendContent" &&
                  toolResultData.result?.status === "success" &&
                  Array.isArray(toolResultData.result?.courses) &&
                  toolResultData.result.courses.length > 0
                ) {
                  pendingCoursesRef.current = toolResultData.result.courses;
                }
                break;
              }

              case "token": {
                const tokenData = data as { text: string };
                if (!mountedRef.current) break;

                if (!streamingMessageIdRef.current) {
                  // First token — create the streaming placeholder message
                  const streamingId = crypto.randomUUID();
                  streamingMessageIdRef.current = streamingId;
                  const streamingMessage: FredMessage = {
                    id: streamingId,
                    role: "assistant",
                    content: tokenData.text,
                    timestamp: new Date(),
                    isStreaming: true,
                  };
                  setMessages(prev => [...prev, streamingMessage]);
                } else {
                  // Subsequent tokens — append to existing streaming message
                  const id = streamingMessageIdRef.current;
                  setMessages(prev => prev.map(msg =>
                    msg.id === id
                      ? { ...msg, content: msg.content + tokenData.text }
                      : msg
                  ));
                }
                break;
              }

              case "response": {
                const responseData = data as {
                  content: string;
                  action?: string;
                  confidence?: number;
                  requiresApproval?: boolean;
                  reasoning?: string;
                };

                // Map confidence number to level
                let confidence: "high" | "medium" | "low" = "medium";
                if (responseData.confidence !== undefined) {
                  if (responseData.confidence >= 0.8) confidence = "high";
                  else if (responseData.confidence >= 0.5) confidence = "medium";
                  else confidence = "low";
                }

                const assistantMessage: FredMessage = {
                  id: streamingMessageIdRef.current || crypto.randomUUID(),
                  role: "assistant",
                  content: responseData.content,
                  timestamp: new Date(),
                  confidence,
                  action: responseData.action,
                  requiresApproval: responseData.requiresApproval,
                  reasoning: responseData.reasoning,
                  isStreaming: false,
                  // Attach any staged course recommendations from tool results
                  courses: pendingCoursesRef.current,
                };

                if (mountedRef.current) {
                  if (streamingMessageIdRef.current) {
                    // Replace the streaming message with the final complete message
                    const id = streamingMessageIdRef.current;
                    setMessages(prev => prev.map(msg => msg.id === id ? assistantMessage : msg));
                  } else {
                    // No streaming happened (non-streaming path) — append as before
                    setMessages(prev => [...prev, assistantMessage]);
                  }
                  streamingMessageIdRef.current = null;
                }
                break;
              }

              case "done": {
                const doneData = data as { sessionId?: string };
                if (doneData.sessionId && doneData.sessionId !== sessionIdRef.current) {
                  sessionIdRef.current = doneData.sessionId;
                  setSessionIdState(doneData.sessionId);
                  sessionStorage.setItem(SESSION_STORAGE_KEY, doneData.sessionId);
                }
                receivedDone = true;
                if (mountedRef.current) {
                  setState("complete");
                  // Reset to idle after a brief moment (cleanup-safe)
                  if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
                  idleTimerRef.current = setTimeout(() => {
                    if (mountedRef.current) setState("idle");
                  }, 500);
                }
                break;
              }

              case "error": {
                const errorData = data as { message?: string; error?: string };
                throw new Error(errorData.message || errorData.error || "Stream error from server");
              }
            }
          }
        }
      } finally {
        // Release the reader lock so the browser can clean up the connection
        try {
          reader.releaseLock();
        } catch {
          // Already released — ignore
        }
      }

      // If the stream ended without a "done" event, the server likely crashed mid-response.
      if (!receivedDone) {
        throw new Error("Connection to FRED was interrupted");
      }
    };

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      await attemptStream(abortControllerRef.current.signal);
    } catch (firstErr) {
      if (firstErr instanceof Error && firstErr.name === "AbortError") {
        // User cancelled - don't show error or retry
        if (mountedRef.current) setState("idle");
        return;
      }

      // Silent auto-retry: transient failures (~20% first-message) usually succeed on retry.
      // Remove any partial streaming message from the failed attempt before retrying.
      console.warn("[useFredChat] First attempt failed, retrying once:", firstErr);
      if (streamingMessageIdRef.current && mountedRef.current) {
        const partialId = streamingMessageIdRef.current;
        setMessages(prev => prev.filter(msg => msg.id !== partialId));
        streamingMessageIdRef.current = null;
      }

      // Reset UI state for the retry attempt
      if (mountedRef.current) {
        setState("connecting");
        setAnalysis(null);
        setSynthesis(null);
      }

      // Create a fresh abort controller for the retry
      abortControllerRef.current = new AbortController();

      try {
        await attemptStream(abortControllerRef.current.signal);
      } catch (retryErr) {
        if (retryErr instanceof Error && retryErr.name === "AbortError") {
          if (mountedRef.current) setState("idle");
          return;
        }

        console.error("[useFredChat] Retry also failed:", retryErr);
        const errorMessage = retryErr instanceof Error ? retryErr.message : "Failed to get response";
        if (mountedRef.current) {
          // Clean up any partial streaming message from the retry attempt
          if (streamingMessageIdRef.current) {
            const partialId = streamingMessageIdRef.current;
            setMessages(prev => prev.filter(msg => msg.id !== partialId));
            streamingMessageIdRef.current = null;
          }

          setError(errorMessage);
          setState("error");

          // Add error message as assistant response
          const errorResponseMessage: FredMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "I'm having trouble processing your message right now. Please try again.",
            timestamp: new Date(),
            confidence: "low",
          };
          setMessages(prev => [...prev, errorResponseMessage]);
        }
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [context, storeInMemory, pageContext]);

  // Clear error
  // Dismiss wellbeing alert
  const dismissWellbeingAlert = useCallback(() => {
    setWellbeingAlert(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    if (state === "error") {
      setState("idle");
    }
  }, [state]);

  // Reset conversation
  const reset = useCallback(() => {
    // Abort any in-flight request
    abortControllerRef.current?.abort();

    // Clear state
    setMessages([]);
    setState("idle");
    setAnalysis(null);
    setSynthesis(null);
    setError(null);
    setRedFlags([]);

    // Generate new session ID and clear persisted messages
    const newSessionId = crypto.randomUUID();
    sessionIdRef.current = newSessionId;
    setSessionIdState(newSessionId);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
      sessionStorage.removeItem(MESSAGES_STORAGE_KEY);
    }
  }, []);

  return {
    messages,
    sendMessage,
    state,
    isProcessing: state !== "idle" && state !== "complete" && state !== "error",
    sessionId: sessionIdState,
    analysis,
    synthesis,
    error,
    clearError,
    reset,
    redFlags,
    wellbeingAlert,
    dismissWellbeingAlert,
  };
}
