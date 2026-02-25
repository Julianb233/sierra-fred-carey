"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Phone, ArrowRight, Sparkles } from "lucide-react";
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
  hasHadConversations?: boolean;
}

export function FredHero({
  userName,
  canCallFred,
  onCallFred,
  hasHadConversations = false,
}: FredHeroProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState<number | null>(null);
  const [fredOnline, setFredOnline] = useState(true);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) setFredOnline(false);
      })
      .catch(() => setFredOnline(false));
  }, []);

  const greeting = hasHadConversations
    ? `Welcome back, ${userName}.`
    : `Hey ${userName}, Fred is ready for you.`;

  const subtext = hasHadConversations
    ? "Pick up where you left off — your mentor is waiting."
    : "Tell him what's on your mind. Everything else on this page comes from that conversation.";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 dark:from-black dark:via-gray-950 dark:to-black border border-gray-800 shadow-2xl">
      {/* Subtle orange glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#ff6a1a]/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff6a1a]/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

      <div className="relative p-6 sm:p-8 lg:p-10">
        {/* FRED identity */}
        <div className="flex items-center gap-2 mb-5">
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

        {/* Main heading */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">
          {greeting}
        </h1>
        <p className="text-gray-400 text-base sm:text-lg mb-8 max-w-xl">
          {subtext}
        </p>

        {/* Primary actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Button
            onClick={() => router.push("/chat")}
            size="lg"
            className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white text-base font-semibold px-8 py-6 h-auto rounded-xl shadow-lg shadow-[#ff6a1a]/30 transition-all hover:shadow-[#ff6a1a]/50 hover:scale-[1.02] group"
          >
            <MessageSquare className="h-5 w-5 mr-2.5 group-hover:scale-110 transition-transform" />
            Message Fred
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>

          {canCallFred ? (
            <Button
              onClick={onCallFred}
              size="lg"
              variant="outline"
              className="border-gray-700 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-800 text-white text-base font-semibold px-8 py-6 h-auto rounded-xl transition-all"
            >
              <Phone className="h-5 w-5 mr-2.5" />
              Call Fred
            </Button>
          ) : (
            <Button
              onClick={() => router.push("/chat")}
              size="lg"
              variant="outline"
              className="border-gray-700 hover:border-[#ff6a1a]/40 bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white text-base font-semibold px-8 py-6 h-auto rounded-xl transition-all group"
            >
              <Phone className="h-5 w-5 mr-2.5 text-gray-500 group-hover:text-[#ff6a1a] transition-colors" />
              <span>Call Fred</span>
              <span className="ml-2 text-xs font-medium text-[#ff6a1a] bg-[#ff6a1a]/10 px-2 py-0.5 rounded-full">Pro</span>
            </Button>
          )}
        </div>

        {/* Conversation starters */}
        <div>
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
      </div>
    </div>
  );
}
