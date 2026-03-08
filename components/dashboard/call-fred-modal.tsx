"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type AudioCaptureOptions,
  type RoomConnectOptions,
  type RoomOptions,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from "livekit-client";
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
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LastDiscussed } from "@/components/voice/last-discussed";

// ============================================================================
// Samsung / Android WebRTC Compatibility
// ============================================================================

/**
 * Detect Samsung Internet or Samsung devices where WebRTC voice
 * cuts off after a few seconds due to aggressive audio track suspension.
 */
function isSamsungDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes("samsungbrowser") ||
    ua.includes("samsung") ||
    // SM-G/SM-A/SM-S/SM-N are Samsung Galaxy model prefixes
    /sm-[gasn]\d/i.test(navigator.userAgent)
  );
}

/**
 * Build RoomOptions with Samsung-friendly WebRTC configuration.
 *
 * Samsung Internet and Chrome on Samsung Galaxy devices have known issues:
 * - Aggressive audio track suspension when tab loses focus
 * - ICE candidate gathering timeouts with default settings
 * - Opus DTX (discontinuous transmission) causes silence detection to kill tracks
 * - Audio processing (AEC/AGC/NS) interacts badly with some Samsung audio HALs
 */
function buildRoomOptions(): RoomOptions {
  const samsung = isSamsungDevice();

  const options: RoomOptions = {
    // Adaptive streaming reduces bandwidth negotiation issues
    adaptiveStream: true,
    // Dynacast saves bandwidth when tracks are not needed
    dynacast: true,
    // Prevent disconnect on page hide — Samsung notification drawer triggers this
    disconnectOnPageLeave: false,
    // Set default audio capture constraints for all mic enables
    audioCaptureDefaults: buildAudioCaptureOptions(),
  };

  if (samsung) {
    console.log("[CallFred] Samsung device detected, applying WebRTC workarounds");
    // WebAudioMix routes all audio through Web Audio API, which works around
    // Samsung Internet's aggressive audio track suspension and autoplay blocking
    options.webAudioMix = true;
  }

  return options;
}

/**
 * Build RoomConnectOptions with Samsung-friendly RTCConfiguration.
 */
function buildConnectOptions(): RoomConnectOptions {
  const samsung = isSamsungDevice();

  const options: RoomConnectOptions = {};

  if (samsung) {
    options.rtcConfig = {
      // Use all ICE transport candidates for Samsung network reliability
      iceTransportPolicy: "all",
      // Pre-allocate ICE candidates for faster negotiation
      iceCandidatePoolSize: 4,
    };
    // Samsung browsers can be slower to establish WebRTC connections
    options.peerConnectionTimeout = 25_000;
  }

  return options;
}

/**
 * Build audio capture options. Samsung devices need specific constraints
 * to prevent the browser from silencing the microphone track.
 */
function buildAudioCaptureOptions(): AudioCaptureOptions {
  const samsung = isSamsungDevice();

  if (samsung) {
    // Samsung audio HAL sometimes conflicts with browser-level processing.
    // Disable autoGainControl which Samsung Internet handles at OS level,
    // and reduce processing that can cause the track to appear silent.
    return {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false,
      // Lower sample rate is more reliable on Samsung audio drivers
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

/**
 * Resume any suspended AudioContext instances on the page.
 * Samsung Internet and some Android browsers require a user gesture
 * to resume the AudioContext, otherwise audio playback is silenced.
 */
async function resumeAudioContext(): Promise<void> {
  try {
    // The AudioContext may be created by LiveKit internally
    // and suspended by Samsung's autoplay policy
    const ctx = new AudioContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
      console.log("[CallFred] AudioContext resumed from suspended state");
    }
    // Close this temporary context - LiveKit manages its own
    await ctx.close();
  } catch {
    // Not critical - LiveKit will manage its own AudioContext
  }
}

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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting'>('connected');

  const roomNameRef = useRef<string>("");
  const roomRef = useRef<Room | null>(null);
  const agentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMutedRef = useRef(false);
  const samsungWatchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const { seconds, formatted: timerFormatted, reset: resetTimer } = useCallTimer(
    callState === "in-call"
  );

  // Auto-scroll transcript to bottom when new entries arrive
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptEntries]);

  // Max duration in seconds
  const maxDuration = callType === "on-demand" ? 600 : 1800;

  // Auto-end when max duration reached
  useEffect(() => {
    if (callState === "in-call" && seconds >= maxDuration) {
      handleEndCall();
    }
  }, [seconds, callState, maxDuration]);

  // Clean up LiveKit room and timers on unmount
  useEffect(() => {
    return () => {
      if (agentTimeoutRef.current) {
        clearTimeout(agentTimeoutRef.current);
        agentTimeoutRef.current = null;
      }
      if (samsungWatchdogRef.current) {
        clearInterval(samsungWatchdogRef.current);
        samsungWatchdogRef.current = null;
      }
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCallState("idle");
      setError(null);
      setCallSummary(null);
      setTranscriptEntries([]);
      setConnectionStatus('connected');
      resetTimer();
    } else {
      // Disconnect room when modal closes
      if (samsungWatchdogRef.current) {
        clearInterval(samsungWatchdogRef.current);
        samsungWatchdogRef.current = null;
      }
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
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

      // Resume AudioContext before connecting (Samsung autoplay policy)
      await resumeAudioContext();

      // Connect to LiveKit room
      console.log('[CallFred] Creating room, url:', data.url, 'room:', data.room);
      const room = new Room(buildRoomOptions());
      roomRef.current = room;

      // P0 Fix: Attach remote audio tracks so the user can hear Fred
      room.on(
        RoomEvent.TrackSubscribed,
        (track, _publication: RemoteTrackPublication, _participant: RemoteParticipant) => {
          console.log('[CallFred] Track subscribed:', track.kind, 'from:', _participant.identity);
          if (track.kind === Track.Kind.Audio) {
            const audioEl = track.attach();
            audioEl.volume = 1;
            // Samsung Internet needs explicit attributes for reliable playback
            audioEl.setAttribute("playsinline", "true");
            audioEl.setAttribute("autoplay", "true");
            document.body.appendChild(audioEl);
            console.log('[CallFred] Audio element attached, paused:', audioEl.paused);
            // Force play in case autoplay is blocked
            audioEl.play().catch((e) => {
              console.warn('[CallFred] Audio play blocked:', e);
              // On Samsung, retry play after a short delay
              // as the browser may need time to negotiate audio focus
              if (isSamsungDevice()) {
                setTimeout(() => {
                  audioEl.play().catch((e2) =>
                    console.warn('[CallFred] Samsung audio retry also blocked:', e2)
                  );
                }, 500);
              }
            });
          }
        }
      );

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
      });

      // P1 Fix: Handle unexpected disconnects
      room.on(RoomEvent.Disconnected, () => {
        if (agentTimeoutRef.current) {
          clearTimeout(agentTimeoutRef.current);
          agentTimeoutRef.current = null;
        }
        roomRef.current = null;
        setError("Call disconnected unexpectedly. Please try again.");
        setCallState("error");
      });

      // Reconnection UX: show banner during network interruption
      room.on(RoomEvent.Reconnecting, () => {
        console.log('[CallFred] Reconnecting...');
        setConnectionStatus('reconnecting');
      });
      room.on(RoomEvent.Reconnected, () => {
        console.log('[CallFred] Reconnected');
        setConnectionStatus('connected');
      });

      // Handle media device errors (Samsung mic revocation, permission changes)
      room.on(RoomEvent.MediaDevicesError, (error: Error) => {
        console.error('[CallFred] MediaDevicesError:', error.message);
        // On Samsung, this fires when the browser suspends the mic track.
        // Attempt to re-enable the microphone rather than showing an error.
        if (roomRef.current) {
          const audioOpts = buildAudioCaptureOptions();
          roomRef.current.localParticipant
            .setMicrophoneEnabled(true, audioOpts)
            .then(() => {
              console.log('[CallFred] Microphone re-enabled after device error');
            })
            .catch((reEnableErr) => {
              console.error('[CallFred] Failed to re-enable mic:', reEnableErr);
              setError("Microphone was disconnected. Please check permissions and try again.");
              setCallState("error");
            });
        }
      });

      // Listen for transcript data from the voice agent (filtered by topic)
      room.on(
        RoomEvent.DataReceived,
        (payload: Uint8Array, _participant, _kind, topic) => {
          if (topic !== undefined && topic !== "transcript") return;
          try {
            const message = JSON.parse(new TextDecoder().decode(payload));
            if (message.speaker && message.text) {
              setTranscriptEntries((prev) => [
                ...prev,
                {
                  speaker: message.speaker,
                  text: message.text,
                  timestamp: message.timestamp || new Date().toISOString(),
                },
              ]);
            }
          } catch {
            // Ignore non-JSON data packets
          }
        }
      );

      try {
        const connectOpts = buildConnectOptions();
        console.log('[CallFred] Connecting to LiveKit...', isSamsungDevice() ? '(Samsung mode)' : '');
        await room.connect(data.url, data.token, connectOpts);
        console.log('[CallFred] Connected! State:', room.state, 'localParticipant:', room.localParticipant.identity);
        console.log('[CallFred] Remote participants:', room.remoteParticipants.size);
        for (const [, p] of room.remoteParticipants) {
          console.log('[CallFred] Remote:', p.identity, 'tracks:', p.trackPublications.size);
        }
      } catch (connectErr) {
        console.error('[CallFred] Connect failed:', connectErr);
        roomRef.current = null;
        throw new Error("Failed to connect to call server. Please check your network and try again.");
      }

      // Enable microphone after connecting with Samsung-friendly audio constraints
      try {
        const audioOpts = buildAudioCaptureOptions();
        console.log('[CallFred] Enabling microphone...', isSamsungDevice() ? '(Samsung mode)' : '');
        await room.localParticipant.setMicrophoneEnabled(true, audioOpts);
        const micPubs = Array.from(room.localParticipant.trackPublications.values());
        console.log('[CallFred] Microphone enabled. Published tracks:', micPubs.length, micPubs.map(p => p.kind));
      } catch (micErr) {
        console.error('[CallFred] Microphone failed:', micErr);
        // Disconnect since the call won't work without a mic
        room.disconnect();
        roomRef.current = null;
        throw new Error("Microphone access is required for the call. Please allow microphone permissions and try again.");
      }

      // Log all participant and connection events for debugging
      room.on(RoomEvent.ParticipantConnected, (p) => {
        console.log('[CallFred] ParticipantConnected:', p.identity, 'kind:', p.kind);
      });
      room.on(RoomEvent.TrackPublished, (pub, participant) => {
        console.log('[CallFred] TrackPublished:', pub.kind, 'from:', participant.identity);
      });
      room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        console.log('[CallFred] ConnectionQuality:', quality, 'for:', participant.identity);
      });
      room.on(RoomEvent.SignalConnected, () => {
        console.log('[CallFred] SignalConnected');
      });

      // P1 Fix: Timeout if agent doesn't join within 30 seconds
      const hasRemoteParticipant = room.remoteParticipants.size > 0;
      if (!hasRemoteParticipant) {
        agentTimeoutRef.current = setTimeout(() => {
          agentTimeoutRef.current = null;
          if (roomRef.current && roomRef.current.remoteParticipants.size === 0) {
            roomRef.current.disconnect();
            roomRef.current = null;
            setError("Fred couldn't join the call. Please try again in a moment.");
            setCallState("error");
          }
        }, 30_000);

        // Clear timeout when agent joins
        room.on(RoomEvent.ParticipantConnected, () => {
          if (agentTimeoutRef.current) {
            clearTimeout(agentTimeoutRef.current);
            agentTimeoutRef.current = null;
          }
        });
      }

      setCallState("in-call");

      // Samsung workaround: Monitor local audio track for silent muting.
      // Samsung Internet can silently mute the track (track.isMuted becomes true)
      // without firing MediaDevicesError. Poll and re-enable if detected.
      if (isSamsungDevice()) {
        samsungWatchdogRef.current = setInterval(() => {
          const currentRoom = roomRef.current;
          if (!currentRoom) {
            if (samsungWatchdogRef.current) clearInterval(samsungWatchdogRef.current);
            return;
          }
          const micPub = Array.from(
            currentRoom.localParticipant.trackPublications.values()
          ).find((p) => p.source === Track.Source.Microphone);

          if (micPub && micPub.isMuted && !isMutedRef.current) {
            console.warn('[CallFred] Samsung: Detected silent mic mute, re-enabling...');
            const audioOpts = buildAudioCaptureOptions();
            currentRoom.localParticipant
              .setMicrophoneEnabled(true, audioOpts)
              .catch((e) => console.warn('[CallFred] Samsung mic re-enable failed:', e));
          }
        }, 3000);
      }
    } catch (err) {
      console.error("[CallFred] Error starting call:", err);
      setError(err instanceof Error ? err.message : "Failed to start call");
      setCallState("error");
    }
  };

  const handleToggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    isMutedRef.current = newMuted;
    try {
      const audioOpts = buildAudioCaptureOptions();
      await room.localParticipant.setMicrophoneEnabled(!newMuted, audioOpts);
    } catch (err) {
      console.warn("[CallFred] Failed to toggle mute:", err);
      // Revert on failure
      setIsMuted(!newMuted);
      isMutedRef.current = !newMuted;
    }
  }, [isMuted]);

  const handleEndCall = async () => {
    setCallState("ending");

    // Clean up Samsung watchdog
    if (samsungWatchdogRef.current) {
      clearInterval(samsungWatchdogRef.current);
      samsungWatchdogRef.current = null;
    }

    // Disconnect from LiveKit room before generating summary
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

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

    // Phase 82: Inject voice transcript into chat history for continuity
    if (transcriptEntries.length > 0) {
      try {
        await fetch("/api/voice/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: transcriptEntries }),
        });
      } catch (err) {
        console.warn("[CallFred] Failed to inject transcript to chat:", err);
      }
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
          (callState === "in-call" || (callState === "ended" && callSummary)) && "sm:max-w-lg"
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
              <LastDiscussed className="mb-1" />
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
            <div className="space-y-4">
              {/* Reconnecting Banner */}
              {connectionStatus === 'reconnecting' && (
                <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs text-center py-1.5 rounded-md flex items-center justify-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Reconnecting...
                </div>
              )}

              {/* Live Transcript */}
              <div className="max-h-[200px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
                {transcriptEntries.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                    Listening...
                  </p>
                ) : (
                  <div className="space-y-2">
                    {transcriptEntries.map((entry, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex flex-col",
                          entry.speaker === "user" ? "items-end" : "items-start"
                        )}
                      >
                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                          {entry.speaker === "user" ? "You" : "Fred"}
                        </span>
                        <span
                          className={cn(
                            "text-sm px-3 py-1.5 rounded-lg max-w-[85%] inline-block",
                            entry.speaker === "user"
                              ? "bg-[#ff6a1a] text-white"
                              : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                          )}
                        >
                          {entry.text}
                        </span>
                      </div>
                    ))}
                    <div ref={transcriptEndRef} />
                  </div>
                )}
              </div>

              {/* Call Controls */}
              <div className="flex items-center justify-center gap-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleToggleMute}
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
