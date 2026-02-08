"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  MessageSquare,
  Loader2,
  Lightbulb,
  Clock,
  Shield,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
// Lobby Component
// ============================================================================

function CoachingLobby({
  roomName,
  onConnect,
}: {
  roomName: string;
  onConnect: () => void;
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
}: CoachingLayoutProps) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("lobby");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Generate a unique room name for this session
  const roomName = useMemo(
    () => `coaching-${userId}-${Date.now()}`,
    [userId]
  );

  const handleConnect = useCallback(() => {
    setConnectionState("connecting");
    // The VideoRoom component handles the actual connection
    // We transition to "connected" immediately since VideoRoom manages its own state
    setConnectionState("connected");
  }, []);

  const handleLeave = useCallback(() => {
    setConnectionState("lobby");
  }, []);

  // Lobby state
  if (connectionState === "lobby") {
    return (
      <CoachingLobby roomName={roomName} onConnect={handleConnect} />
    );
  }

  // Connected / Connecting state
  return (
    <div className={cn("flex flex-col h-[calc(100vh-4rem)]", className)}>
      {/* Mobile sidebar toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 lg:hidden">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Coaching Session
        </span>
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
              <CoachingSidebar className="h-full" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CoachingLayout;
