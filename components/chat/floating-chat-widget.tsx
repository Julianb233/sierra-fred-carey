"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, X, Minus, Send, Loader2, Phone, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFredChat } from "@/lib/hooks/use-fred-chat";
import { getRandomQuote } from "@/lib/fred-brain";

// ============================================================================
// Types
// ============================================================================

interface FloatingMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ============================================================================
// Widget States
// ============================================================================

type WidgetState = "collapsed" | "expanded" | "minimized";

// Pages where the widget should NOT appear (full chat page exists)
const HIDDEN_PATHS = ["/chat", "/dashboard/coaching"];

// ============================================================================
// Floating Chat Widget
// ============================================================================

export function FloatingChatWidget({
  onCallFred,
}: {
  onCallFred?: () => void;
}) {
  const pathname = usePathname();
  const [widgetState, setWidgetState] = useState<WidgetState>("collapsed");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  const {
    messages: fredMessages,
    sendMessage,
    isProcessing,
    reset,
  } = useFredChat();

  // Build display messages with greeting
  const greeting = useMemo<FloatingMessage>(
    () => ({
      id: "widget-greeting",
      role: "assistant",
      content: `Hey, Fred here. "${getRandomQuote()}" What can I help you with?`,
      timestamp: new Date(),
    }),
    []
  );

  const messages: FloatingMessage[] = useMemo(() => {
    const mapped: FloatingMessage[] = fredMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));
    return [greeting, ...mapped];
  }, [fredMessages, greeting]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (widgetState === "expanded") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isProcessing, widgetState]);

  // Focus input when expanded
  useEffect(() => {
    if (widgetState === "expanded") {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [widgetState]);

  // Hide on certain pages
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) {
    return null;
  }

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isProcessing) return;
    setInputValue("");
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleExpand = () => {
    setWidgetState((prev) =>
      prev === "expanded" ? "collapsed" : "expanded"
    );
  };

  const minimize = () => setWidgetState("minimized");

  const toggleVoice = () => {
    if (isVoiceRecording) {
      setIsVoiceRecording(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInputValue((prev) => (prev ? prev + " " + transcript : transcript));
        }
        setIsVoiceRecording(false);
      };
      recognition.onerror = () => setIsVoiceRecording(false);
      recognition.onend = () => setIsVoiceRecording(false);
      recognition.start();
      setIsVoiceRecording(true);
    }
  };

  // Unread indicator: show dot when minimized and there are messages beyond greeting
  const hasUnread = widgetState !== "expanded" && fredMessages.length > 0;

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {widgetState !== "expanded" && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed z-50 right-4 lg:right-6"
            style={{
              bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
            }}
          >
            <Button
              onClick={toggleExpand}
              size="icon"
              className={cn(
                "h-14 w-14 rounded-full shadow-lg",
                "bg-[#ff6a1a] hover:bg-[#ea580c]",
                "hover:shadow-xl hover:shadow-[#ff6a1a]/30",
                "transition-all duration-300",
                "text-white border-0"
              )}
              aria-label="Chat with Fred"
            >
              <MessageSquare className="h-6 w-6" />
              {hasUnread && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 border-2 border-white animate-pulse" />
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {widgetState === "expanded" && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "fixed z-50 flex flex-col",
              "bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800",
              "shadow-2xl shadow-black/20",
              // Mobile: full-screen overlay
              "inset-0 rounded-none",
              // Desktop: panel in bottom-right
              "lg:inset-auto lg:right-6 lg:bottom-6",
              "lg:w-[420px] lg:h-[600px] lg:max-h-[80vh]",
              "lg:rounded-2xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-[#ff6a1a] to-orange-500 text-white lg:rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="font-bold text-sm">S</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Fred Cary</h3>
                  <p className="text-xs text-white/80">Your Startup Mentor</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {onCallFred && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onCallFred}
                    className="h-9 w-9 text-white hover:bg-white/20 rounded-full"
                    aria-label="Call Fred"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={minimize}
                  className="h-9 w-9 text-white hover:bg-white/20 rounded-full hidden lg:flex"
                  aria-label="Minimize chat"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleExpand}
                  className="h-9 w-9 text-white hover:bg-white/20 rounded-full"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
              role="log"
              aria-live="polite"
              aria-label="Chat with Fred"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-[#ff6a1a] text-white rounded-br-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#ff6a1a] animate-bounce [animation-delay:0ms]" />
                      <span className="h-2 w-2 rounded-full bg-[#ff6a1a] animate-bounce [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-[#ff6a1a] animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-end gap-2">
                {/* Voice input — mobile only */}
                <Button
                  onClick={toggleVoice}
                  disabled={isProcessing}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl shrink-0 md:hidden",
                    isVoiceRecording
                      ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                      : "text-gray-500 hover:text-[#ff6a1a]"
                  )}
                  aria-label={isVoiceRecording ? "Stop recording" : "Voice input"}
                >
                  {isVoiceRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Fred anything..."
                  disabled={isProcessing}
                  rows={1}
                  className={cn(
                    "flex-1 resize-none bg-gray-100 dark:bg-gray-800 rounded-xl",
                    "px-3 py-2.5 text-sm outline-none",
                    "border border-transparent focus:border-[#ff6a1a]/50",
                    "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                    "min-h-[44px] max-h-24",
                    "disabled:opacity-50"
                  )}
                  aria-label="Message to Fred"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isProcessing}
                  size="icon"
                  className={cn(
                    "h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl shrink-0",
                    "bg-[#ff6a1a] hover:bg-[#ea580c]",
                    "disabled:opacity-50"
                  )}
                  aria-label="Send message"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
