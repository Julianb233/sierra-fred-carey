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
// Hook Implementation
// ============================================================================

export function useFredChat(options: UseFredChatOptions = {}): UseFredChatReturn {
  const {
    sessionId: providedSessionId,
    context,
    storeInMemory = true,
    onStateChange,
    onAnalysis,
    onSynthesis,
  } = options;

  // State
  const [messages, setMessages] = useState<FredMessage[]>([]);
  const [state, setState] = useState<FredState>("idle");
  const [analysis, setAnalysis] = useState<FredAnalysis | null>(null);
  const [synthesis, setSynthesis] = useState<FredSynthesis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redFlags, setRedFlags] = useState<RedFlag[]>([]);
  const [wellbeingAlert, setWellbeingAlert] = useState<BurnoutSignals | null>(null);

  const sessionIdRef = useRef<string>(getOrCreateSessionId(providedSessionId));
  const abortControllerRef = useRef<AbortController | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Track mounted state for safe state updates after async operations
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

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
    // Add user message immediately
    const userMessage: FredMessage = {
      id: Date.now().toString(),
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

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/fred/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          context,
          sessionId: sessionIdRef.current,
          stream: true,
          storeInMemory,
        }),
        signal: abortControllerRef.current.signal,
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
              case "connected":
                if (mountedRef.current) setState("analyzing");
                break;

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
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: responseData.content,
                  timestamp: new Date(),
                  confidence,
                  action: responseData.action,
                  requiresApproval: responseData.requiresApproval,
                  reasoning: responseData.reasoning,
                };

                if (mountedRef.current) setMessages(prev => [...prev, assistantMessage]);
                break;
              }

              case "done":
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

              case "error": {
                const errorData = data as { message: string };
                if (mountedRef.current) {
                  setError(errorData.message);
                  setState("error");
                }
                break;
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
      // Show a graceful error instead of leaving the UI stuck in a processing state.
      if (!receivedDone && mountedRef.current) {
        setError("Connection to FRED was interrupted. Please try again.");
        setState("error");

        const errorResponseMessage: FredMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I lost my train of thought there. Could you send that again?",
          timestamp: new Date(),
          confidence: "low",
        };
        setMessages(prev => [...prev, errorResponseMessage]);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled - don't show error
        if (mountedRef.current) setState("idle");
        return;
      }

      console.error("[useFredChat] Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to get response";
      if (mountedRef.current) {
        setError(errorMessage);
        setState("error");

        // Add error message as assistant response
        const errorResponseMessage: FredMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I'm having trouble processing your message right now. Please try again.",
          timestamp: new Date(),
          confidence: "low",
        };
        setMessages(prev => [...prev, errorResponseMessage]);
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [context, storeInMemory]);

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

    // Generate new session ID
    const newSessionId = crypto.randomUUID();
    sessionIdRef.current = newSessionId;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
    }
  }, []);

  return {
    messages,
    sendMessage,
    state,
    isProcessing: state !== "idle" && state !== "complete" && state !== "error",
    sessionId: sessionIdRef.current,
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
