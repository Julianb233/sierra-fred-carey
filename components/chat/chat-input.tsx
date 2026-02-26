"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Mic, Square } from "lucide-react";
import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useWhisperFlow } from "@/lib/hooks/use-whisper-flow";
import { VoiceWaveform } from "@/components/chat/voice-chat-button";
import { toast } from "sonner";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  showVoiceInput?: boolean;
}

export function ChatInput({ onSend, isLoading = false, placeholder = "Ask Fred anything...", showVoiceInput = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Whisper Flow replaces browser Speech Recognition for production-grade accuracy
  const handleTranscript = useCallback((text: string) => {
    setMessage((prev) => (prev ? prev + " " + text : text));
  }, []);

  const handleVoiceError = useCallback((error: string) => {
    toast.error(error);
  }, []);

  const {
    isRecording,
    isTranscribing,
    isProcessing: isVoiceProcessing,
    audioLevel,
    duration,
    isSupported,
    toggleRecording,
    error: voiceError,
  } = useWhisperFlow({
    onTranscript: handleTranscript,
    onError: handleVoiceError,
    maxDuration: 120,
  });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Focus textarea after transcription completes
  useEffect(() => {
    if (!isVoiceProcessing && message && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isVoiceProcessing, message]);

  const handleSend = () => {
    if (!message.trim()) return;
    if (isLoading) {
      toast.info("Hold on — Fred is still thinking...");
      return;
    }
    onSend(message.trim());
    setMessage("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Recording indicator banner */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2"
          >
            <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <VoiceWaveform audioLevel={audioLevel} isActive={isRecording} barCount={7} />
              <span className="text-xs font-mono tabular-nums text-red-600 dark:text-red-400">
                {formatDuration(duration)}
              </span>
              <span className="text-xs text-red-600/70 dark:text-red-400/70">
                Recording — tap mic to stop
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcribing indicator */}
      <AnimatePresence>
        {isTranscribing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2"
          >
            <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[#ff6a1a]/5 border border-[#ff6a1a]/20">
              <Loader2 className="h-3 w-3 animate-spin text-[#ff6a1a]" />
              <span className="text-xs text-[#ff6a1a]">Transcribing with Whisper...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glassmorphism container */}
      <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl">
        {/* Gradient glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 blur-xl opacity-50 -z-10" />

        <div className="flex items-end gap-2 p-3">
          {/* Voice input button — Whisper Flow powered */}
          {showVoiceInput && isSupported && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              {isRecording && (
                <span className="absolute inset-0 rounded-xl bg-red-500/30 animate-ping" />
              )}
              <Button
                onClick={toggleRecording}
                disabled={isLoading || isTranscribing}
                size="icon"
                variant="ghost"
                aria-label={
                  isTranscribing
                    ? "Transcribing..."
                    : isRecording
                      ? "Stop recording"
                      : "Voice input (Whisper)"
                }
                className={cn(
                  "relative h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl shrink-0",
                  isRecording
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : isTranscribing
                      ? "bg-[#ff6a1a]/20 text-[#ff6a1a]"
                      : "text-gray-500 hover:text-[#ff6a1a] hover:bg-[#ff6a1a]/10"
                )}
              >
                {isTranscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isRecording ? (
                  <Square className="h-3.5 w-3.5" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </motion.div>
          )}

          {/* Auto-resize textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening..." : placeholder}
            disabled={isLoading || isRecording}
            rows={1}
            aria-label="Message to Fred"
            className={cn(
              "flex-1 bg-transparent border-0 outline-none resize-none",
              "text-base text-foreground placeholder:text-muted-foreground/60",
              "max-h-32 min-h-[44px] py-2 px-1",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />

          {/* Send button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={handleSend}
              disabled={!message.trim() || isLoading}
              size="icon"
              aria-label="Send message"
              className={cn(
                "h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl",
                "bg-[#ff6a1a] hover:bg-[#ea580c]",
                "hover:shadow-lg hover:shadow-[#ff6a1a]/50",
                "transition-all duration-300",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </motion.div>
        </div>

        {/* Typing hint — hidden on mobile */}
        <div className="hidden sm:flex items-center justify-between px-4 pb-2 text-xs text-muted-foreground/60">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {showVoiceInput && isSupported && (
            <span className="flex items-center gap-1">
              <Mic className="h-3 w-3" />
              Whisper voice input
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
