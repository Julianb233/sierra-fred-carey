"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// VoiceChatButton — Prominent, animated voice input button with audio waveform
//
// Shows recording state with pulsing rings and audio-level visualization.
// Designed for both inline (chat input) and standalone (floating) use.
// ============================================================================

interface VoiceChatButtonProps {
  isRecording: boolean;
  isTranscribing: boolean;
  audioLevel: number;
  duration: number;
  onClick: () => void;
  disabled?: boolean;
  /** "inline" fits inside chat input bar; "prominent" is the large standalone button */
  variant?: "inline" | "prominent";
  className?: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function VoiceChatButton({
  isRecording,
  isTranscribing,
  audioLevel,
  duration,
  onClick,
  disabled = false,
  variant = "inline",
  className,
}: VoiceChatButtonProps) {
  const isProminent = variant === "prominent";
  const size = isProminent ? "h-16 w-16" : "h-11 w-11 min-h-[44px] min-w-[44px]";
  const iconSize = isProminent ? "h-7 w-7" : "h-4 w-4";

  // Scale rings based on audio level (1.0 to 1.6)
  const ringScale = 1 + audioLevel * 0.6;

  return (
    <div className={cn("relative flex flex-col items-center gap-1", className)}>
      {/* Pulsing background rings — visible when recording */}
      <AnimatePresence>
        {isRecording && (
          <>
            <motion.div
              key="ring-1"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [ringScale, ringScale + 0.3, ringScale],
                opacity: [0.3, 0.15, 0.3],
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className={cn(
                "absolute rounded-full bg-[#ff6a1a]/20",
                isProminent ? "h-24 w-24" : "h-16 w-16"
              )}
              style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
            />
            <motion.div
              key="ring-2"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [ringScale + 0.2, ringScale + 0.6, ringScale + 0.2],
                opacity: [0.2, 0.05, 0.2],
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              className={cn(
                "absolute rounded-full bg-[#ff6a1a]/10",
                isProminent ? "h-32 w-32" : "h-20 w-20"
              )}
              style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.button
        onClick={onClick}
        disabled={disabled || isTranscribing}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={
          isTranscribing
            ? "Transcribing..."
            : isRecording
              ? "Stop recording"
              : "Start voice input"
        }
        className={cn(
          "relative z-10 rounded-full flex items-center justify-center",
          "transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a1a]/50",
          size,
          isRecording
            ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
            : isTranscribing
              ? "bg-[#ff6a1a]/80 text-white cursor-wait"
              : "bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 hover:shadow-xl hover:shadow-[#ff6a1a]/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {isTranscribing ? (
          <Loader2 className={cn(iconSize, "animate-spin")} />
        ) : isRecording ? (
          <Square className={cn(isProminent ? "h-6 w-6" : "h-3.5 w-3.5")} />
        ) : (
          <Mic className={iconSize} />
        )}
      </motion.button>

      {/* Duration label — shown when recording or transcribing */}
      <AnimatePresence>
        {(isRecording || isTranscribing) && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={cn(
              "text-[10px] font-mono tabular-nums",
              isRecording ? "text-red-500" : "text-[#ff6a1a]"
            )}
          >
            {isTranscribing ? "Transcribing..." : formatDuration(duration)}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// VoiceWaveform — Audio level visualization bar
// ============================================================================

interface VoiceWaveformProps {
  audioLevel: number;
  isActive: boolean;
  barCount?: number;
  className?: string;
}

export function VoiceWaveform({
  audioLevel,
  isActive,
  barCount = 5,
  className,
}: VoiceWaveformProps) {
  return (
    <div className={cn("flex items-center gap-0.5 h-4", className)}>
      {Array.from({ length: barCount }).map((_, i) => {
        // Create a wave pattern: center bars are tallest
        const centerDistance = Math.abs(i - Math.floor(barCount / 2));
        const maxHeight = 1 - centerDistance * 0.15;
        const height = isActive ? Math.max(0.2, audioLevel * maxHeight) : 0.2;

        return (
          <motion.div
            key={i}
            animate={{
              scaleY: height,
              backgroundColor: isActive ? "#ff6a1a" : "rgb(156 163 175)",
            }}
            transition={{
              duration: 0.15,
              delay: i * 0.03,
            }}
            className="w-0.5 h-full rounded-full origin-center"
            style={{ backgroundColor: isActive ? "#ff6a1a" : "rgb(156 163 175)" }}
          />
        );
      })}
    </div>
  );
}
