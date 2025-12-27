"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex items-start gap-3 mb-6"
    >
      {/* AI Avatar */}
      <Avatar className="h-10 w-10 border-2 border-purple-500/50 ring-2 ring-purple-500/20">
        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-semibold">
          AI
        </AvatarFallback>
      </Avatar>

      {/* Typing animation */}
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -8, 0],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
              className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
