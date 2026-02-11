"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { RedFlag } from "@/lib/fred/types";
import { RedFlagBadge } from "./red-flag-badge";
import { TtsButton } from "./tts-button";

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  index: number;
  risks?: RedFlag[];
  /** When true, show the TTS playback button on assistant messages. Requires Pro+. */
  showTts?: boolean;
}

export function ChatMessage({ message, index, risks, showTts }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        "flex items-start gap-3 mb-6",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.05 + 0.1 }}
      >
        {isUser ? (
          <Avatar className="h-10 w-10 border-2 border-[#ff6a1a]/50 ring-2 ring-[#ff6a1a]/20">
            <AvatarImage src="" />
            <AvatarFallback className="bg-gradient-to-br from-[#ff6a1a] to-orange-500 text-white text-sm font-semibold">
              U
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-10 w-10 rounded-full border-2 border-[#ff6a1a]/50 ring-2 ring-[#ff6a1a]/20 bg-gradient-to-br from-[#ff6a1a] to-orange-500 flex items-center justify-center overflow-hidden">
            <span className="text-white font-bold text-sm">S</span>
          </div>
        )}
      </motion.div>

      {/* Message bubble */}
      <div className={cn(
        "flex flex-col max-w-[85%] sm:max-w-[75%]",
        isUser ? "items-end" : "items-start"
      )}>
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, delay: index * 0.05 + 0.15 }}
          className={cn(
            "relative px-4 py-3 rounded-2xl shadow-lg group",
            isUser
              ? "bg-gradient-to-br from-[#ff6a1a] via-orange-500 to-amber-500 text-white rounded-tr-sm"
              : "backdrop-blur-xl bg-white/10 border border-white/20 text-foreground rounded-tl-sm"
          )}
        >
          {/* Glassmorphism glow effect for AI messages */}
          {!isUser && (
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: "radial-gradient(circle at 50% 50%, rgba(255, 106, 26, 0.15) 0%, transparent 70%)",
              }}
            />
          )}

          {/* Gradient glow for user messages */}
          {isUser && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#ff6a1a]/50 via-orange-500/50 to-amber-500/50 blur-xl opacity-50 -z-10" />
          )}

          <p className={cn(
            "relative z-10 text-sm leading-relaxed whitespace-pre-wrap",
            isUser ? "text-white" : "text-foreground/90"
          )}>
            {message.content}
          </p>
        </motion.div>

        {/* Red Flag Badges */}
        {risks && risks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 + 0.25 }}
            className="flex flex-wrap gap-1.5 mt-2 px-1"
          >
            {risks.map((flag, i) => (
              <RedFlagBadge
                key={flag.id || i}
                category={flag.category}
                severity={flag.severity}
                title={flag.title}
              />
            ))}
          </motion.div>
        )}

        {/* Message actions: TTS + Timestamp */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: index * 0.05 + 0.2 }}
          className="flex items-center gap-1 mt-1.5 px-2"
        >
          {/* TTS button -- assistant messages only, Pro+ tier */}
          {!isUser && showTts && (
            <TtsButton text={message.content} />
          )}

          <span className="text-xs text-muted-foreground">
            {formatTimestamp(message.timestamp)}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
