"use client";

import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// FloatingVoiceFab — Persistent floating voice button for desktop dashboard
//
// Provides a prominent, always-accessible voice input entry point on desktop.
// Mobile users access voice via the bottom nav center button instead.
// ============================================================================

interface FloatingVoiceFabProps {
  onClick: () => void;
  className?: string;
}

export function FloatingVoiceFab({ onClick, className }: FloatingVoiceFabProps) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5 }}
      className={cn("fixed bottom-6 right-6 z-30", className)}
    >
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Voice chat with Fred"
        className={cn(
          "group relative flex items-center gap-2",
          "h-14 pl-4 pr-5 rounded-full",
          "bg-[#ff6a1a] hover:bg-[#ea580c] text-white",
          "shadow-lg shadow-[#ff6a1a]/30 hover:shadow-xl hover:shadow-[#ff6a1a]/40",
          "transition-all duration-300",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a1a]/50 focus-visible:ring-offset-2"
        )}
      >
        {/* Subtle pulse ring */}
        <span className="absolute inset-0 rounded-full animate-ping bg-[#ff6a1a]/20 pointer-events-none" style={{ animationDuration: "3s" }} />

        <Mic className="h-5 w-5 relative z-10" />
        <span className="text-sm font-semibold relative z-10 whitespace-nowrap">
          Talk to Fred
        </span>
      </motion.button>
    </motion.div>
  );
}
