"use client";

import { motion } from "framer-motion";

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex items-start gap-3 mb-6"
    >
      {/* Fred Avatar — matches chat-message assistant avatar */}
      <div className="h-10 w-10 rounded-full border-2 border-[#ff6a1a]/50 ring-2 ring-[#ff6a1a]/20 bg-gradient-to-br from-[#ff6a1a] to-orange-500 flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm">S</span>
      </div>

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
              className="w-2 h-2 rounded-full bg-gradient-to-br from-[#ff6a1a] to-orange-500"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
