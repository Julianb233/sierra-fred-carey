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
        padding: isExpanded ? "1rem 3.5rem" : "1rem 2.5rem",
        minWidth: isExpanded ? "320px" : "220px",
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
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${SAHARA_COLORS.mutedBeige}20 0%, ${SAHARA_COLORS.deepRed}40 50%, ${SAHARA_COLORS.darkBlue}60 100%)`,
          opacity: isExpanded ? 1 : 0,
        }}
        animate={{
          backgroundPosition: isExpanded ? ["0% 50%", "100% 50%", "0% 50%"] : "0% 50%",
        }}
        transition={{
          duration: 3,
          repeat: isExpanded ? Infinity : 0,
          ease: "linear",
        }}
      />

      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${SAHARA_COLORS.offWhite}15 50%, transparent 100%)`,
        }}
        animate={{
          x: isExpanded ? ["-100%", "200%"] : "-100%",
        }}
        transition={{
          duration: 1.5,
          repeat: isExpanded ? Infinity : 0,
          ease: "easeInOut",
        }}
      />

      {/* Content container */}
      <div className="relative z-10 flex items-center gap-3 min-w-0">
        {/* Text content with smooth transition */}
        <div className="relative flex items-center justify-center min-w-0 flex-1">
          <AnimatePresence mode="wait">
            {!isExpanded ? (
              <motion.span
                key="main"
                initial={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="whitespace-nowrap"
              >
                {mainText}
              </motion.span>
            ) : (
              <motion.span
                key="expanded"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                className="whitespace-nowrap flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4 flex-shrink-0" />
                {expandedText}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Arrow icon - always visible */}
        <motion.div
          animate={{
            x: isExpanded ? 3 : 0,
          }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0"
        >
          <ArrowRight className="h-5 w-5" />
        </motion.div>
      </div>

      {/* Glow effect */}
      <motion.div
        className="absolute -inset-1 rounded-full blur-xl"
        style={{
          background: `radial-gradient(circle, ${SAHARA_COLORS.mutedBeige}40 0%, transparent 70%)`,
          opacity: isExpanded ? 0.6 : 0,
        }}
        animate={{
          scale: isExpanded ? [1, 1.2, 1] : 1,
        }}
        transition={{
          duration: 2,
          repeat: isExpanded ? Infinity : 0,
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
