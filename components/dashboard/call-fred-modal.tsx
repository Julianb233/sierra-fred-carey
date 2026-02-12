"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Loader2,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type CallState = "idle" | "connecting" | "in-call" | "ending" | "ended" | "error";

interface CallTranscriptEntry {
  speaker: "user" | "fred";
  text: string;
  timestamp: string;
}

interface CallSummary {
  transcript: string;
  summary: string;
  decisions: string[];
  nextActions: string[];
}

interface CallFredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callType?: "on-demand" | "scheduled";
}

// ============================================================================
// Timer Hook
// ============================================================================

function useCallTimer(isActive: boolean) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  const reset = useCallback(() => setSeconds(0), []);

  const formatted = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  return { seconds, formatted, reset };
}

// ============================================================================
// Component
// ============================================================================

export function CallFredModal({
  open,
  onOpenChange,
  callType = "on-demand",
}: CallFredModalProps) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callSummary, setCallSummary] = useState<CallSummary | null>(null);
  const [transcriptEntries, setTranscriptEntries] = useState<CallTranscriptEntry[]>([]);

  const roomNameRef = useRef<string>("");
  const { seconds, formatted: timerFormatted, reset: resetTimer } = useCallTimer(
    callState === "in-call"
  );

  // Max duration in seconds
  const maxDuration = callType === "on-demand" ? 600 : 1800;

  // Auto-end when max duration reached
  useEffect(() => {
    if (callState === "in-call" && seconds >= maxDuration) {
      handleEndCall();
    }
  }, [seconds, callState, maxDuration]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCallState("idle");
      setError(null);
      setCallSummary(null);
      setTranscriptEntries([]);
      resetTimer();
    }
  }, [open, resetTimer]);

  const handleStartCall = async () => {
    setCallState("connecting");
    setError(null);

    try {
      const response = await fetch("/api/fred/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callType }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      roomNameRef.current = data.room;

      // In production this would connect to LiveKit.
      // For the MVP, simulate the call connection.
      setTimeout(() => {
        setCallState("in-call");
      }, 1500);
    } catch (err) {
      console.error("[CallFred] Error starting call:", err);
      setError(err instanceof Error ? err.message : "Failed to start call");
      setCallState("error");
    }
  };

  const handleEndCall = async () => {
    setCallState("ending");

    try {
      // Generate post-call summary
      const response = await fetch("/api/fred/call/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: roomNameRef.current,
          callType,
          durationSeconds: seconds,
          transcript: transcriptEntries.length > 0
            ? transcriptEntries
            : [
                {
                  speaker: "fred",
                  text: "Call completed. Review your next actions below.",
                  timestamp: new Date().toISOString(),
                },
              ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCallSummary({
          transcript: data.transcript,
          summary: data.summary,
          decisions: data.decisions,
          nextActions: data.nextActions,
        });
      }
    } catch (err) {
      console.warn("[CallFred] Failed to generate summary:", err);
    }

    setCallState("ended");
  };

  const handleClose = () => {
    if (callState === "in-call") {
      // Don't allow closing during active call
      return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "sm:max-w-md p-0 gap-0 overflow-hidden",
          callState === "ended" && callSummary && "sm:max-w-lg"
        )}
      >
        <DialogTitle className="sr-only">Call Fred</DialogTitle>

        {/* Call Header */}
        <div className="bg-gradient-to-br from-[#ff6a1a] to-orange-600 p-6 text-white text-center">
          <div className="mx-auto mb-3 h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
            {callState === "connecting" ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : callState === "error" ? (
              <AlertCircle className="h-8 w-8" />
            ) : callState === "ended" ? (
              <CheckCircle2 className="h-8 w-8" />
            ) : (
              <Phone className="h-8 w-8" />
            )}
          </div>

          <h3 className="font-bold text-lg">
            {callState === "idle" && "Call Fred"}
            {callState === "connecting" && "Connecting..."}
            {callState === "in-call" && "On Call with Fred"}
            {callState === "ending" && "Ending Call..."}
            {callState === "ended" && "Call Ended"}
            {callState === "error" && "Connection Failed"}
          </h3>

          <p className="text-sm text-white/80 mt-1">
            {callState === "idle" &&
              (callType === "on-demand"
                ? "Quick decision call (up to 10 min)"
                : "Scheduled coaching call (up to 30 min)")}
            {callState === "connecting" && "Setting up your call with Fred..."}
            {callState === "in-call" && timerFormatted}
            {callState === "ending" && "Generating your call summary..."}
            {callState === "ended" && `Duration: ${timerFormatted}`}
            {callState === "error" && (error || "Unable to connect")}
          </p>
        </div>

        {/* Call Body */}
        <div className="p-6">
          {/* Idle State */}
          {callState === "idle" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Talk through your biggest decision with Fred. After the call,
                you will get a transcript, summary, and your Next 3 Actions.
              </p>
              <Button
                onClick={handleStartCall}
                className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white h-12"
              >
                <Phone className="h-4 w-4 mr-2" />
                Start Call
              </Button>
            </div>
          )}

          {/* In-Call Controls */}
          {callState === "in-call" && (
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  "h-14 w-14 rounded-full",
                  isMuted && "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700"
                )}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <MicOff className="h-6 w-6 text-red-500" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </Button>
              <Button
                size="icon"
                onClick={handleEndCall}
                className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white"
                aria-label="End call"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>
          )}

          {/* Connecting / Ending */}
          {(callState === "connecting" || callState === "ending") && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
            </div>
          )}

          {/* Error */}
          {callState === "error" && (
            <div className="space-y-3">
              <p className="text-sm text-red-600 dark:text-red-400 text-center">
                {error || "Something went wrong. Please try again."}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={handleStartCall}
                  className="flex-1 bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Post-Call Summary */}
          {callState === "ended" && callSummary && (
            <div className="space-y-4">
              {/* Summary */}
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-[#ff6a1a]" />
                  Summary
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {callSummary.summary}
                </p>
              </div>

              {/* Decisions */}
              {callSummary.decisions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Decisions Made</h4>
                  <ul className="space-y-1">
                    {callSummary.decisions.map((d, i) => (
                      <li
                        key={i}
                        className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next 3 Actions */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Next 3 Actions</h4>
                <ol className="space-y-2">
                  {callSummary.nextActions.map((action, i) => (
                    <li
                      key={i}
                      className="text-sm flex items-start gap-2"
                    >
                      <span className="h-5 w-5 rounded-full bg-[#ff6a1a] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {action}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <Button
                onClick={handleClose}
                className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
              >
                Done
              </Button>
            </div>
          )}

          {/* Ended without summary */}
          {callState === "ended" && !callSummary && (
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Call completed.
              </p>
              <Button
                onClick={handleClose}
                className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
