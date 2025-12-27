"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  index: number;
}

export function ChatMessage({ message, index }: ChatMessageProps) {
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
        <Avatar className={cn(
          "h-10 w-10 border-2",
          isUser
            ? "border-primary/50 ring-2 ring-primary/20"
            : "border-purple-500/50 ring-2 ring-purple-500/20"
        )}>
          <AvatarImage src={isUser ? "/avatars/user.png" : "/avatars/ai.png"} />
          <AvatarFallback className={cn(
            "text-sm font-semibold",
            isUser
              ? "bg-gradient-to-br from-primary to-blue-500 text-white"
              : "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
          )}>
            {isUser ? "U" : "AI"}
          </AvatarFallback>
        </Avatar>
      </motion.div>

      {/* Message bubble */}
      <div className={cn(
        "flex flex-col max-w-[75%]",
        isUser ? "items-end" : "items-start"
      )}>
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, delay: index * 0.05 + 0.15 }}
          className={cn(
            "relative px-4 py-3 rounded-2xl shadow-lg group",
            isUser
              ? "bg-gradient-to-br from-primary via-blue-500 to-purple-500 text-white rounded-tr-sm"
              : "backdrop-blur-xl bg-white/10 border border-white/20 text-foreground rounded-tl-sm"
          )}
        >
          {/* Glassmorphism glow effect for AI messages */}
          {!isUser && (
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: "radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.15) 0%, transparent 70%)",
              }}
            />
          )}

          {/* Gradient glow for user messages */}
          {isUser && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/50 via-blue-500/50 to-purple-500/50 blur-xl opacity-50 -z-10" />
          )}

          <p className={cn(
            "relative z-10 text-sm leading-relaxed whitespace-pre-wrap",
            isUser ? "text-white" : "text-foreground/90"
          )}>
            {message.content}
          </p>
        </motion.div>

        {/* Timestamp */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: index * 0.05 + 0.2 }}
          className="text-xs text-muted-foreground mt-1.5 px-2"
        >
          {formatTimestamp(message.timestamp)}
        </motion.span>
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
