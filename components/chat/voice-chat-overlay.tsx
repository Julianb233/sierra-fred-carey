"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceChatButton, VoiceWaveform } from "@/components/chat/voice-chat-button";
import { useWhisperFlow } from "@/lib/hooks/use-whisper-flow";
import { cn } from "@/lib/utils";

// ============================================================================
// VoiceChatOverlay — Full-screen voice recording overlay
//
// Launched from the prominent floating voice button. Provides a focused,
// immersive voice recording experience that transcribes via Whisper Flow
// and feeds the result into the Fred conversation.
// ============================================================================

interface VoiceChatOverlayProps {
  open: boolean;
  onClose: () => void;
  /** Called with the transcribed text, ready to send to Fred */
  onSendMessage: (text: string) => void;
  isLoading?: boolean;
}

export function VoiceChatOverlay({
  open,
  onClose,
  onSendMessage,
  isLoading = false,
}: VoiceChatOverlayProps) {
  const [transcribedText, setTranscribedText] = useState("");
  const [autoSendPending, setAutoSendPending] = useState(false);

  const handleTranscript = useCallback((text: string) => {
    setTranscribedText((prev) => (prev ? prev + " " + text : text));
  }, []);

  const {
    isRecording,
    isTranscribing,
    audioLevel,
    duration,
    isSupported,
    startRecording,
    stopRecording,
    toggleRecording,
    reset,
  } = useWhisperFlow({
    onTranscript: handleTranscript,
    maxDuration: 120,
  });

  // Auto-start recording when overlay opens
  useEffect(() => {
    if (open && isSupported) {
      setTranscribedText("");
      reset();
      // Small delay to let the animation settle
      const timer = setTimeout(() => {
        startRecording();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle close — stop recording if active
  const handleClose = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    setTranscribedText("");
    reset();
    onClose();
  }, [isRecording, stopRecording, reset, onClose]);

  // Send transcribed text
  const handleSend = useCallback(() => {
    if (!transcribedText.trim()) return;
    onSendMessage(transcribedText.trim());
    setTranscribedText("");
    reset();
    onClose();
  }, [transcribedText, onSendMessage, reset, onClose]);

  // Handle "record and send" — stop recording, then auto-send when transcript arrives
  const handleRecordAndSend = useCallback(() => {
    if (isRecording) {
      stopRecording();
      setAutoSendPending(true);
    }
  }, [isRecording, stopRecording]);

  // Auto-send after transcription completes
  useEffect(() => {
    if (autoSendPending && !isTranscribing && transcribedText.trim()) {
      setAutoSendPending(false);
      onSendMessage(transcribedText.trim());
      setTranscribedText("");
      reset();
      onClose();
    } else if (autoSendPending && !isTranscribing && !transcribedText.trim()) {
      setAutoSendPending(false);
    }
  }, [autoSendPending, isTranscribing, transcribedText, onSendMessage, reset, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isRecording) handleClose();
        }}
      >
        {/* Close button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 safe-top"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-10 w-10 rounded-full text-white/70 hover:text-white hover:bg-white/10"
            aria-label="Close voice input"
          >
            <X className="h-5 w-5" />
          </Button>
        </motion.div>

        {/* Central content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="flex flex-col items-center gap-8 px-6 max-w-md w-full"
        >
          {/* Title */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-1">
              {isRecording
                ? "Listening..."
                : isTranscribing
                  ? "Transcribing..."
                  : transcribedText
                    ? "Ready to send"
                    : "Talk to Fred"}
            </h2>
            <p className="text-sm text-white/60">
              {isRecording
                ? "Tap the button when you're done speaking"
                : isTranscribing
                  ? "Converting your voice to text with Whisper"
                  : transcribedText
                    ? "Review and send, or record more"
                    : "Tap the microphone to start"}
            </p>
          </div>

          {/* Voice button with waveform */}
          <div className="relative">
            <VoiceChatButton
              isRecording={isRecording}
              isTranscribing={isTranscribing}
              audioLevel={audioLevel}
              duration={duration}
              onClick={toggleRecording}
              variant="prominent"
            />
          </div>

          {/* Waveform visualization when recording */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0.5 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0, scaleX: 0.5 }}
              >
                <VoiceWaveform
                  audioLevel={audioLevel}
                  isActive={isRecording}
                  barCount={15}
                  className="h-8"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transcribed text preview */}
          <AnimatePresence>
            {transcribedText && !isRecording && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="w-full"
              >
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 max-h-40 overflow-y-auto">
                  <p className="text-white text-sm leading-relaxed">
                    {transcribedText}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            {isRecording ? (
              /* During recording: "Stop & Send" shortcut */
              <Button
                onClick={handleRecordAndSend}
                className="flex-1 h-12 bg-white text-gray-900 hover:bg-gray-100 rounded-xl font-medium"
              >
                <Send className="h-4 w-4 mr-2" />
                Stop & Send
              </Button>
            ) : transcribedText ? (
              /* After transcription: Send or Record More */
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTranscribedText("");
                    reset();
                    startRecording();
                  }}
                  className="flex-1 h-12 rounded-xl border-white/30 text-white hover:bg-white/10"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Record More
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={isLoading}
                  className="flex-1 h-12 bg-[#ff6a1a] hover:bg-[#ea580c] text-white rounded-xl font-medium"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send to Fred
                </Button>
              </>
            ) : isTranscribing ? (
              <div className="flex items-center justify-center gap-2 text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing with Whisper...</span>
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
