"use client";

import { useState, useCallback, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { tts } from "@/lib/tts";
import { cn } from "@/lib/utils";

interface TtsButtonProps {
  /** The text to speak. */
  text: string;
  /** Additional Tailwind classes. */
  className?: string;
}

/**
 * Small speaker icon button that toggles TTS playback for a chat message.
 * Only renders when the browser supports Web Speech API.
 */
export function TtsButton({ text, className }: TtsButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [supported, setSupported] = useState(false);

  // Check support on mount (avoids SSR mismatch)
  useEffect(() => {
    const isSupported = tts.isSupported();
    const timer = setTimeout(() => setSupported(isSupported), 0);
    return () => clearTimeout(timer);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isPlaying) {
        tts.stop();
      }
    };
  }, [isPlaying]);

  const handleClick = useCallback(() => {
    if (isPlaying) {
      tts.stop();
      setIsPlaying(false);
      return;
    }

    tts.speak(text, {
      onStart: () => setIsPlaying(true),
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  }, [isPlaying, text]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isPlaying ? "Stop speaking" : "Read aloud"}
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        "h-7 w-7 transition-colors",
        "hover:bg-white/20 active:scale-95",
        isPlaying
          ? "text-[#ff6a1a] animate-pulse"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {isPlaying ? (
        <VolumeX className="h-3.5 w-3.5" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
