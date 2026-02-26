"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Send, Phone, Sparkles, Mic, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONVERSATION_STARTERS = [
  "What should I be working on right now?",
  "Help me pressure-test my business model",
  "I need help with my pitch deck",
  "Should I raise money or stay bootstrapped?",
  "My growth is stalling — what do I do?",
];

interface FredHeroProps {
  userName: string;
  canCallFred: boolean;
  onCallFred: () => void;
  onVoiceChat?: () => void;
  hasHadConversations?: boolean;
}

export function FredHero({
  userName,
  canCallFred,
  onCallFred,
  onVoiceChat,
  hasHadConversations = false,
}: FredHeroProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState<number | null>(null);
  const [fredOnline, setFredOnline] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) setFredOnline(false);
      })
      .catch(() => setFredOnline(false));
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const greeting = hasHadConversations
    ? `Welcome back, ${userName}.`
    : `Hey ${userName}, Fred is ready for you.`;

  const subtext = hasHadConversations
    ? "Pick up where you left off — type below or tap voice."
    : "Type a message below or tap the mic — everything on this page comes from that conversation.";

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    router.push(`/chat?message=${encodeURIComponent(trimmed)}`);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 dark:from-black dark:via-gray-950 dark:to-black border border-gray-800 shadow-2xl">
      {/* Subtle orange glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#ff6a1a]/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff6a1a]/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

      <div className="relative p-6 sm:p-8 lg:p-10">
        {/* FRED identity */}
        <div className="flex items-center gap-2 mb-4">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full",
            fredOnline ? "bg-green-400 animate-pulse" : "bg-red-400"
          )} />
          <span className={cn(
            "text-sm font-medium",
            fredOnline ? "text-green-400" : "text-red-400"
          )}>
            {fredOnline ? "Fred is online" : "Fred is unavailable"}
          </span>
        </div>

        {/* Compact heading */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight">
          {greeting}
        </h1>
        <p className="text-gray-400 text-sm sm:text-base mb-5 max-w-xl">
          {subtext}
        </p>

        {/* ====== CHAT INPUT — above the fold, first interaction ====== */}
        <div className="mb-6">
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl">
            {/* Gradient glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#ff6a1a]/20 via-[#ff6a1a]/10 to-transparent blur-xl opacity-50 -z-10" />

            <div className="flex items-end gap-2 p-3">
              {/* Voice input button */}
              <Button
                onClick={onVoiceChat || (() => router.push("/chat"))}
                size="icon"
                variant="ghost"
                aria-label="Voice chat with Fred"
                className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl shrink-0 text-gray-500 hover:text-[#ff6a1a] hover:bg-[#ff6a1a]/10"
              >
                <Mic className="h-4 w-4" />
              </Button>

              {/* Auto-resize textarea */}
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Fred anything..."
                rows={1}
                aria-label="Message to Fred"
                className={cn(
                  "flex-1 bg-transparent border-0 outline-none resize-none",
                  "text-base text-white placeholder:text-gray-500",
                  "max-h-32 min-h-[44px] py-2 px-1"
                )}
              />

              {/* Send button */}
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                size="icon"
                aria-label="Send message"
                className={cn(
                  "h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl shrink-0",
                  "bg-[#ff6a1a] hover:bg-[#ea580c]",
                  "hover:shadow-lg hover:shadow-[#ff6a1a]/50",
                  "transition-all duration-300",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Typing hint — desktop only */}
            <div className="hidden sm:flex items-center justify-between px-4 pb-2 text-xs text-gray-500">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span className="flex items-center gap-1">
                <Mic className="h-3 w-3" />
                Voice available
              </span>
            </div>
          </div>
        </div>

        {/* Conversation starters */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Or start here
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {CONVERSATION_STARTERS.map((starter, i) => (
              <button
                key={i}
                onClick={() =>
                  router.push(`/chat?message=${encodeURIComponent(starter)}`)
                }
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "text-sm px-3.5 py-2 rounded-lg border transition-all text-left",
                  hovered === i
                    ? "border-[#ff6a1a]/50 bg-[#ff6a1a]/10 text-white"
                    : "border-gray-700 bg-gray-800/40 text-gray-400 hover:text-gray-200"
                )}
              >
                {starter}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary actions — call/voice buttons */}
        <div className="flex flex-wrap gap-3">
          {canCallFred ? (
            <Button
              onClick={onCallFred}
              size="sm"
              variant="outline"
              className="border-gray-700 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-800 text-white font-medium px-4 py-2 h-auto rounded-lg transition-all"
            >
              <Phone className="h-4 w-4 mr-2" />
              Call Fred
            </Button>
          ) : (
            <Button
              onClick={() => router.push("/pricing")}
              size="sm"
              variant="outline"
              className="border-gray-700 hover:border-[#ff6a1a]/40 bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white font-medium px-4 py-2 h-auto rounded-lg transition-all group"
            >
              <Phone className="h-4 w-4 mr-2 text-gray-500 group-hover:text-[#ff6a1a] transition-colors" />
              Call Fred
              <span className="ml-2 text-xs font-medium text-[#ff6a1a] bg-[#ff6a1a]/10 px-2 py-0.5 rounded-full">Pro</span>
            </Button>
          )}

          <Button
            onClick={() => router.push("/chat")}
            size="sm"
            variant="outline"
            className="border-gray-700 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white font-medium px-4 py-2 h-auto rounded-lg transition-all group"
          >
            Open full chat
            <ArrowRight className="h-3.5 w-3.5 ml-2 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}
