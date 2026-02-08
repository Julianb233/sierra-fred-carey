"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  MessageSquare,
  Loader2,
  Lightbulb,
  Clock,
  Shield,
  X,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { VideoRoom } from "@/components/video/VideoRoom";
import { CoachingSidebar } from "@/components/coaching/coaching-sidebar";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type ConnectionState = "lobby" | "connecting" | "connected";

interface CoachingLayoutProps {
  userId: string;
  userName?: string;
  className?: string;
  /** Current user tier (0=Free, 1=Pro, 2=Studio) */
  userTier?: number;
}

// ============================================================================
// Lobby Tips
// ============================================================================

const COACHING_TIPS = [
  "Prepare 1-2 specific questions before your session for maximum value.",
  "Have your pitch deck or financial model open for screen sharing.",
  "Use the FRED sidebar to get real-time AI insights during the call.",
  "Sessions are recorded for your review (Studio tier).",
  "Focus on decisions you need to make this week.",
];

// ============================================================================
// Session Lifecycle Helpers
// ============================================================================

async function createSession(roomName: string): Promise<string | null> {
  try {
    const res = await fetch("/api/coaching/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.session?.id ?? null;
  } catch {
    console.error("[CoachingLayout] Failed to create session");
    return null;
  }
}

async function updateSession(
  sessionId: string,
  updates: Record<string, unknown>
): Promise<void> {
  try {
    await fetch("/api/coaching/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sessionId, ...updates }),
    });
  } catch {
    console.error("[CoachingLayout] Failed to update session");
  }
}

// ============================================================================
// Lobby Component
// ============================================================================

function CoachingLobby({
  roomName,
  onConnect,
  showRecordingToggle,
  enableRecording,
  onToggleRecording,
}: {
  roomName: string;
  onConnect: () => void;
  showRecordingToggle: boolean;
  enableRecording: boolean;
  onToggleRecording: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8 text-center space-y-6">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#ff6a1a]/20 to-orange-400/20 flex items-center justify-center"
          >
            <Video className="h-10 w-10 text-[#ff6a1a]" />
          </motion.div>

          {/* Title */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Video Coaching Session
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Connect to start your live coaching session with FRED AI sidebar
              assistance.
            </p>
          </div>

          {/* Session Info */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />
              Encrypted
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Up to 30 min
            </span>
          </div>

          {/* Recording Toggle (Studio only) */}
          {showRecordingToggle && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Circle className="h-3.5 w-3.5 text-red-500" />
                <Label htmlFor="recording-toggle" className="text-sm font-medium cursor-pointer">
                  Record session
                </Label>
              </div>
              <Switch
                id="recording-toggle"
                checked={enableRecording}
                onCheckedChange={onToggleRecording}
              />
            </div>
          )}

          {/* Connect Button */}
          <Button
            onClick={onConnect}
            size="lg"
            className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white font-semibold"
          >
            <Video className="h-4 w-4 mr-2" />
            Connect to Start Session
          </Button>

          {/* Tip */}
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2 text-left">
              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {COACHING_TIPS[Math.floor(Math.random() * COACHING_TIPS.length)]}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Layout
// ============================================================================

export function CoachingLayout({
  userId,
  userName,
  className,
  userTier = 0,
}: CoachingLayoutProps) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("lobby");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [enableRecording, setEnableRecording] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const isStudio = userTier >= 2;

  // Generate a unique room name for this session
  const roomName = useMemo(
    () => `coaching-${userId}-${Date.now()}`,
    [userId]
  );

  // Handle browser close / tab close -- attempt to complete session
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current && startedAtRef.current) {
        const endedAt = new Date();
        const durationSeconds = Math.floor(
          (endedAt.getTime() - startedAtRef.current.getTime()) / 1000
        );
        // Use fetch with keepalive for reliability during page unload
        // (sendBeacon only supports POST, but we need PATCH)
        fetch("/api/coaching/sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: sessionIdRef.current,
            status: "completed",
            ended_at: endedAt.toISOString(),
            duration_seconds: durationSeconds,
          }),
          keepalive: true,
        }).catch(() => {
          // Best-effort -- stale session cleanup handles missed completions
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleConnect = useCallback(async () => {
    setConnectionState("connecting");

    // Create session record and mark as in_progress
    const sessionId = await createSession(roomName);
    if (sessionId) {
      sessionIdRef.current = sessionId;
      const now = new Date();
      startedAtRef.current = now;
      await updateSession(sessionId, {
        status: "in_progress",
        started_at: now.toISOString(),
      });
    }

    setConnectionState("connected");
  }, [roomName]);

  const handleLeave = useCallback(async () => {
    // Mark session as completed with duration
    if (sessionIdRef.current && startedAtRef.current) {
      const endedAt = new Date();
      const durationSeconds = Math.floor(
        (endedAt.getTime() - startedAtRef.current.getTime()) / 1000
      );
      await updateSession(sessionIdRef.current, {
        status: "completed",
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
      });
      sessionIdRef.current = null;
      startedAtRef.current = null;
    }

    setConnectionState("lobby");
  }, []);

  // Lobby state
  if (connectionState === "lobby") {
    return (
      <CoachingLobby
        roomName={roomName}
        onConnect={handleConnect}
        showRecordingToggle={isStudio}
        enableRecording={enableRecording}
        onToggleRecording={setEnableRecording}
      />
    );
  }

  // Connected / Connecting state
  return (
    <div className={cn("flex flex-col h-[calc(100vh-4rem)]", className)}>
      {/* Mobile sidebar toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Coaching Session
          </span>
          {enableRecording && isStudio && (
            <span className="flex items-center gap-1 text-xs text-red-500">
              <Circle className="h-2 w-2 fill-red-500 animate-pulse" />
              REC
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="gap-1.5"
        >
          {isSidebarOpen ? (
            <>
              <X className="h-3.5 w-3.5" />
              Hide Chat
            </>
          ) : (
            <>
              <MessageSquare className="h-3.5 w-3.5" />
              FRED Chat
            </>
          )}
        </Button>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Left: Video (70% on desktop, full on mobile) */}
        <div
          className={cn(
            "flex-1 lg:w-[70%] min-h-0",
            isSidebarOpen ? "hidden lg:block" : "block"
          )}
        >
          {connectionState === "connecting" ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
            </div>
          ) : (
            <VideoRoom
              roomName={roomName}
              userName={userName}
              sessionId={sessionIdRef.current ?? undefined}
              onLeave={handleLeave}
            />
          )}
        </div>

        {/* Right: FRED Chat Sidebar (30% on desktop) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "lg:w-[30%] lg:min-w-[280px] lg:max-w-[400px]",
                "w-full lg:block",
                "h-full"
              )}
            >
              <CoachingSidebar
                className="h-full"
                sessionId={sessionIdRef.current ?? undefined}
                onDisconnectPersist
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CoachingLayout;
