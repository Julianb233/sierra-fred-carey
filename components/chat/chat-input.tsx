"use client";

import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, isLoading = false, placeholder = "Ask Fred anything..." }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Glassmorphism container */}
      <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl">
        {/* Gradient glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 blur-xl opacity-50 -z-10" />

        <div className="flex items-end gap-2 p-3">
          {/* Auto-resize textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className={cn(
              "flex-1 bg-transparent border-0 outline-none resize-none",
              "text-sm text-foreground placeholder:text-muted-foreground/60",
              "max-h-32 min-h-[40px] py-2 px-1",
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
              className={cn(
                "h-10 w-10 rounded-xl",
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

        {/* Typing hint */}
        <div className="px-4 pb-2 text-xs text-muted-foreground/60">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </motion.div>
  );
}
