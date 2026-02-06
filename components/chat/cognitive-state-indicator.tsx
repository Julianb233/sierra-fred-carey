"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { FredState } from "@/lib/hooks/use-fred-chat";

interface CognitiveStateIndicatorProps {
  state: FredState;
  className?: string;
}

const STATE_INFO: Record<
  FredState,
  { label: string; description: string; color: string }
> = {
  idle: {
    label: "Ready",
    description: "Waiting for your message",
    color: "text-gray-400",
  },
  connecting: {
    label: "Connecting",
    description: "Establishing connection...",
    color: "text-blue-500",
  },
  analyzing: {
    label: "Analyzing",
    description: "Understanding your message...",
    color: "text-amber-500",
  },
  applying_models: {
    label: "Thinking",
    description: "Applying mental models...",
    color: "text-orange-500",
  },
  synthesizing: {
    label: "Synthesizing",
    description: "Forming recommendation...",
    color: "text-[#ff6a1a]",
  },
  deciding: {
    label: "Deciding",
    description: "Finalizing response...",
    color: "text-green-500",
  },
  complete: {
    label: "Complete",
    description: "Response ready",
    color: "text-green-500",
  },
  error: {
    label: "Error",
    description: "Something went wrong",
    color: "text-red-500",
  },
};

const PROCESSING_STATES: FredState[] = [
  "connecting",
  "analyzing",
  "applying_models",
  "synthesizing",
  "deciding",
];

export function CognitiveStateIndicator({
  state,
  className,
}: CognitiveStateIndicatorProps) {
  const info = STATE_INFO[state];
  const isProcessing = PROCESSING_STATES.includes(state);

  if (state === "idle" || state === "complete") {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex items-center gap-3 px-4 py-2 rounded-full",
          "bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm",
          "border border-gray-200 dark:border-gray-700",
          "shadow-sm",
          className
        )}
      >
        {/* Animated dots */}
        {isProcessing && (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={cn("w-2 h-2 rounded-full", info.color.replace("text-", "bg-"))}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>
        )}

        {/* State label */}
        <div className="flex flex-col">
          <span className={cn("text-sm font-medium", info.color)}>
            {info.label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {info.description}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Compact version for inline display
 */
export function CognitiveStateBadge({
  state,
  className,
}: CognitiveStateIndicatorProps) {
  const info = STATE_INFO[state];
  const isProcessing = PROCESSING_STATES.includes(state);

  if (state === "idle" || state === "complete") {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
          "bg-gray-100 dark:bg-gray-800",
          info.color,
          className
        )}
      >
        {isProcessing && (
          <motion.div
            className={cn("w-1.5 h-1.5 rounded-full", info.color.replace("text-", "bg-"))}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
        <span>{info.label}</span>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Step-based progress indicator
 */
export function CognitiveStepIndicator({
  state,
  className,
}: CognitiveStateIndicatorProps) {
  const steps = [
    { key: "analyzing", label: "Analyze" },
    { key: "applying_models", label: "Think" },
    { key: "synthesizing", label: "Synthesize" },
    { key: "deciding", label: "Respond" },
  ];

  const currentIndex = steps.findIndex((s) => s.key === state);
  const isProcessing = currentIndex >= 0;

  if (!isProcessing && state !== "connecting") {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn(
        "flex items-center justify-center gap-1",
        className
      )}
    >
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            {index > 0 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1",
                  isComplete ? "bg-[#ff6a1a]" : "bg-gray-200 dark:bg-gray-700"
                )}
              />
            )}
            <div className="flex flex-col items-center">
              <motion.div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                  isActive && "bg-[#ff6a1a] text-white",
                  isComplete && "bg-[#ff6a1a]/20 text-[#ff6a1a]",
                  isPending && "bg-gray-100 dark:bg-gray-800 text-gray-400"
                )}
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5, repeat: isActive ? Infinity : 0 }}
              >
                {isComplete ? "✓" : index + 1}
              </motion.div>
              <span
                className={cn(
                  "text-xs mt-1",
                  isActive && "text-[#ff6a1a] font-medium",
                  isComplete && "text-[#ff6a1a]",
                  isPending && "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
