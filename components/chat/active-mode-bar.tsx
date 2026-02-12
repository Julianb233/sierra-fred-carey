"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Compass, Target, TrendingUp, Briefcase } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type ChatMode = "founder-os" | "positioning" | "investor-readiness" | "strategy";

interface ActiveModeBarProps {
  mode: ChatMode;
  className?: string;
}

// ============================================================================
// Mode Configuration
// ============================================================================

const MODE_CONFIG: Record<
  ChatMode,
  {
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  "founder-os": {
    label: "Neutral",
    description: "General mentoring",
    icon: <Compass className="h-3.5 w-3.5" />,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    borderColor: "border-gray-200 dark:border-gray-700",
  },
  positioning: {
    label: "Positioning",
    description: "Clarifying your market position",
    icon: <Target className="h-3.5 w-3.5" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  "investor-readiness": {
    label: "Investor",
    description: "Evaluating fundraising readiness",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  strategy: {
    label: "Strategy",
    description: "Building your go-to-market plan",
    icon: <Briefcase className="h-3.5 w-3.5" />,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
};

// ============================================================================
// Component
// ============================================================================

export function ActiveModeBar({ mode, className }: ActiveModeBarProps) {
  const config = MODE_CONFIG[mode] || MODE_CONFIG["founder-os"];

  return (
    <div
      className={cn(
        "flex items-center justify-center py-1.5 px-4",
        "border-b bg-white/60 dark:bg-gray-950/60 backdrop-blur-sm",
        config.borderColor,
        className
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
            "border",
            config.bgColor,
            config.color,
            config.borderColor
          )}
        >
          {config.icon}
          <span>{config.label}</span>
          <span className="hidden sm:inline text-[10px] opacity-70">
            {config.description}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
