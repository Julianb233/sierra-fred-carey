"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================================
// Tips Data
// ============================================================================

const COACHING_TIPS = [
  {
    title: "Prepare Your Questions",
    body: "Come to each session with 1-2 specific decisions or challenges. The more focused your question, the more actionable FRED's coaching will be.",
  },
  {
    title: "Share Your Screen",
    body: "Have your pitch deck, financial model, or product demo ready to share. Visual context helps FRED provide more precise feedback.",
  },
  {
    title: "Use the FRED Sidebar",
    body: "During your session, the AI sidebar provides real-time insights. Ask FRED to analyze what's being discussed for deeper strategy guidance.",
  },
  {
    title: "Focus on This Week",
    body: "The most impactful coaching sessions focus on decisions you need to make in the next 7 days. Urgency drives clarity.",
  },
  {
    title: "Review Session Notes",
    body: "After each session, add notes in your session history. Tracking your progress over time reveals patterns and growth areas.",
  },
  {
    title: "Challenge Assumptions",
    body: "The best founders use coaching to stress-test their thinking. Ask FRED to play devil's advocate on your biggest assumptions.",
  },
] as const;

// ============================================================================
// Types
// ============================================================================

interface CoachingTipsProps {
  /** Rotation interval in milliseconds (default: 5000) */
  interval?: number;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CoachingTips({
  interval = 5000,
  className,
}: CoachingTipsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const advanceTip = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % COACHING_TIPS.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(advanceTip, interval);
    return () => clearInterval(timer);
  }, [advanceTip, interval]);

  const tip = COACHING_TIPS[currentIndex];

  return (
    <Card
      className={cn(
        "overflow-hidden border-amber-200 dark:border-amber-800/50",
        "bg-gradient-to-br from-amber-50/80 to-orange-50/50",
        "dark:from-amber-900/20 dark:to-orange-900/10",
        className
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="shrink-0 w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <Lightbulb className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            Coaching Tip
          </span>
          {/* Dot indicators */}
          <div className="flex items-center gap-1 ml-auto">
            {COACHING_TIPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  i === currentIndex
                    ? "bg-amber-500"
                    : "bg-amber-300/50 dark:bg-amber-700/50"
                )}
                aria-label={`Go to tip ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Rotating Content */}
        <div className="relative min-h-[60px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
                {tip.title}
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/70 leading-relaxed">
                {tip.body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}

export default CoachingTips;
