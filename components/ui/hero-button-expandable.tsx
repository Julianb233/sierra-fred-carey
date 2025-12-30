"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Sahara Fred Carey Brand Colors
const SAHARA_COLORS = {
  darkBlue: "#242C34",      // Pantone 426 C
  deepRed: "#702425",       // Pantone 188 C
  mutedBeige: "#BEAA75",    // Pantone 466 C
  offWhite: "#F7F7EB",      // Pantone 663 C
};

interface HeroButtonExpandableProps {
  mainText?: string;
  expandedText?: string;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export default function HeroButtonExpandable({
  mainText = "Start your journey",
  expandedText = "Join the Waitlist",
  onClick,
  href,
  className,
}: HeroButtonExpandableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const buttonContent = (
    <motion.div
      onHoverStart={() => setIsExpanded(true)}
      onHoverEnd={() => setIsExpanded(false)}
      onClick={onClick}
      className={cn(
        "relative group overflow-hidden",
        "flex items-center justify-center",
        "rounded-full",
        "font-semibold text-lg",
        "transition-all duration-500 ease-out",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "cursor-pointer",
        className
      )}
      style={{
        background: isExpanded
          ? `linear-gradient(135deg, ${SAHARA_COLORS.deepRed} 0%, ${SAHARA_COLORS.darkBlue} 100%)`
          : SAHARA_COLORS.deepRed,
        color: SAHARA_COLORS.offWhite,
        padding: isExpanded ? "1rem 3rem" : "1rem 2rem",
        minWidth: isExpanded ? "280px" : "200px",
        boxShadow: isExpanded
          ? `0 20px 40px -15px ${SAHARA_COLORS.deepRed}40, 0 0 60px -20px ${SAHARA_COLORS.mutedBeige}30`
          : `0 10px 30px -10px ${SAHARA_COLORS.deepRed}30`,
      }}
      whileHover={{
        scale: 1.05,
      }}
      whileTap={{
        scale: 0.98,
      }}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100"
        style={{
          background: `linear-gradient(135deg, ${SAHARA_COLORS.mutedBeige}20 0%, ${SAHARA_COLORS.deepRed}40 50%, ${SAHARA_COLORS.darkBlue}60 100%)`,
        }}
        animate={{
          backgroundPosition: isExpanded ? ["0% 50%", "100% 50%", "0% 50%"] : "0% 50%",
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${SAHARA_COLORS.offWhite}20 50%, transparent 100%)`,
          transform: "translateX(-100%)",
        }}
        animate={{
          transform: isExpanded ? ["translateX(-100%)", "translateX(200%)"] : "translateX(-100%)",
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Content container */}
      <div className="relative z-10 flex items-center gap-3">
        {/* Main text */}
        <motion.span
          className="whitespace-nowrap"
          animate={{
            opacity: isExpanded ? 0 : 1,
            x: isExpanded ? -20 : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          {mainText}
        </motion.span>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: "auto" }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              <Sparkles className="h-4 w-4" />
              <span className="whitespace-nowrap">{expandedText}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Arrow icon */}
        <motion.div
          animate={{
            x: isExpanded ? 5 : 0,
            rotate: isExpanded ? 0 : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          <ArrowRight className="h-5 w-5" />
        </motion.div>
      </div>

      {/* Glow effect */}
      <motion.div
        className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 blur-xl"
        style={{
          background: `radial-gradient(circle, ${SAHARA_COLORS.mutedBeige}40 0%, transparent 70%)`,
        }}
        animate={{
          scale: isExpanded ? [1, 1.2, 1] : 1,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {buttonContent}
      </Link>
    );
  }

  return buttonContent;
}

