"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MessageCircle, Send, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase/client";

const FRED_GREETING =
  "Hey, I'm Fred Cary. I've built 30+ companies, taken 3 public, and mentored 10,000+ founders. What's on your mind?";

const SUGGESTION_CHIPS = [
  "I have a startup idea",
  "How do I raise funding?",
  "Help me validate my business",
];

/**
 * Interactive mini-chat preview for the homepage hero section.
 * Shows Fred's greeting with a typewriter effect, suggestion chips,
 * and an input field. On interaction, routes to /chat (authed) or /signup (unauthed).
 */
export default function HeroChatPreview() {
  const router = useRouter();
  const [displayedText, setDisplayedText] = useState("");
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  // Typewriter effect for Fred's greeting
  useEffect(() => {
    let i = 0;
    const speed = 18; // ms per character
    const timer = setInterval(() => {
      i++;
      setDisplayedText(FRED_GREETING.slice(0, i));
      if (i >= FRED_GREETING.length) {
        clearInterval(timer);
        setIsTypingComplete(true);
      }
    }, speed);
    return () => clearInterval(timer);
  }, []);

  // Blinking cursor
  useEffect(() => {
    if (isTypingComplete) {
      const timer = setTimeout(() => setShowCursor(false), 1500);
      return () => clearTimeout(timer);
    }
    const interval = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(interval);
  }, [isTypingComplete]);

  const handleInteraction = useCallback(
    async (message?: string) => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const params = message
            ? `?message=${encodeURIComponent(message)}`
            : "";
          router.push(`/chat${params}`);
        } else {
          router.push("/signup");
        }
      } catch {
        // If auth check fails, send to signup
        router.push("/signup");
      }
    },
    [router]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      handleInteraction(inputValue.trim());
    }
  };

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden",
          "bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl",
          "border border-gray-200/80 dark:border-gray-700/80",
          "shadow-2xl shadow-[#ff6a1a]/10 dark:shadow-[#ff6a1a]/5",
          "hover:shadow-[#ff6a1a]/20 transition-shadow duration-500"
        )}
      >
        {/* Header bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#ff6a1a]/30">
              <Image
                src="/fred-cary.jpg"
                alt="Fred Cary"
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Online indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white dark:border-gray-900" />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Fred Cary
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              Online now
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>AI Mentor</span>
          </div>
        </div>

        {/* Chat body */}
        <div className="px-4 py-4 min-h-[120px]">
          {/* Fred's message bubble */}
          <div className="flex gap-3">
            <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden mt-1 hidden sm:block">
              <Image
                src="/fred-cary.jpg"
                alt=""
                width={28}
                height={28}
                className="w-full h-full object-cover"
              />
            </div>
            <div
              className={cn(
                "rounded-2xl rounded-tl-md px-4 py-3 max-w-[90%]",
                "bg-gray-50 dark:bg-gray-800/80",
                "text-sm text-gray-800 dark:text-gray-200 leading-relaxed"
              )}
            >
              {displayedText}
              {showCursor && (
                <span className="inline-block w-0.5 h-4 bg-[#ff6a1a] ml-0.5 align-middle" />
              )}
            </div>
          </div>

          {/* Suggestion chips */}
          <AnimatePresence>
            {isTypingComplete && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="flex flex-wrap gap-2 mt-4 ml-0 sm:ml-10"
              >
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleInteraction(chip)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full border",
                      "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                      "text-gray-700 dark:text-gray-300",
                      "hover:bg-[#ff6a1a]/10 hover:border-[#ff6a1a]/40 hover:text-[#ff6a1a]",
                      "transition-all duration-200 cursor-pointer"
                    )}
                  >
                    {chip}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input bar */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask Fred anything..."
            className={cn(
              "flex-1 bg-transparent text-sm outline-none min-h-[44px]",
              "text-gray-900 dark:text-white",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500"
            )}
          />
          <button
            type="submit"
            className={cn(
              "shrink-0 w-10 h-10 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center",
              "bg-[#ff6a1a] hover:bg-[#ea580c] text-white",
              "transition-colors duration-200",
              !inputValue.trim() && "opacity-50 cursor-default"
            )}
            disabled={!inputValue.trim()}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        {/* Subtle bottom CTA */}
        <AnimatePresence>
          {isTypingComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="px-4 py-2 bg-[#ff6a1a]/5 dark:bg-[#ff6a1a]/10 text-center"
            >
              <button
                onClick={() => handleInteraction()}
                className="text-xs text-[#ff6a1a] hover:text-[#ea580c] font-medium inline-flex items-center gap-1 transition-colors"
              >
                Start a full conversation with Fred
                <ArrowRight className="h-3 w-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
