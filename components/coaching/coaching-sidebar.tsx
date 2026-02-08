"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, MessageSquare, RotateCcw } from "lucide-react";
import { useFredChat, type FredMessage } from "@/lib/hooks/use-fred-chat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface CoachingSidebarProps {
  className?: string;
  /** Maximum messages to display (scrollable) */
  maxVisible?: number;
}

// ============================================================================
// Compact Message Bubble
// ============================================================================

function CompactMessage({ message }: { message: FredMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "flex",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] px-3 py-1.5 rounded-xl text-xs leading-relaxed",
          isUser
            ? "bg-[#ff6a1a] text-white rounded-br-sm"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm"
        )}
      >
        {message.content}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Sidebar Component
// ============================================================================

export function CoachingSidebar({
  className,
  maxVisible = 10,
}: CoachingSidebarProps) {
  const {
    messages,
    sendMessage,
    isProcessing,
    reset,
  } = useFredChat({
    context: {
      goals: [
        "You are in a live video coaching session. Keep responses concise and actionable.",
      ],
    },
    storeInMemory: true,
  });

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Show only the last N messages
  const visibleMessages = useMemo(() => {
    return messages.slice(-maxVisible);
  }, [messages, maxVisible]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, isProcessing]);

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

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#ff6a1a]" />
          <span className="text-xs font-semibold text-gray-900 dark:text-white">
            FRED Coach
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={reset}
          title="Reset conversation"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
        {visibleMessages.length === 0 && (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-xs text-gray-400 px-4">
              Ask FRED anything during your coaching session. Responses are kept
              concise and actionable.
            </p>
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {visibleMessages.map((msg) => (
            <CompactMessage key={msg.id} message={msg} />
          ))}
        </AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>FRED is thinking...</span>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-end gap-1.5">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask FRED..."
            disabled={isProcessing}
            rows={1}
            className={cn(
              "flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
              "rounded-lg px-2.5 py-1.5 text-xs resize-none outline-none",
              "focus:border-[#ff6a1a] focus:ring-1 focus:ring-[#ff6a1a]/30",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500",
              "max-h-20 min-h-[32px]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isProcessing}
            size="icon"
            className="h-8 w-8 rounded-lg bg-[#ff6a1a] hover:bg-[#ea580c] shrink-0"
          >
            {isProcessing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CoachingSidebar;
