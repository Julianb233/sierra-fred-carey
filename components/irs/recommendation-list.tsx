"use client";

import { motion } from "framer-motion";
import { ArrowRight, Clock, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Recommendation, IRSCategory } from "@/lib/fred/irs/types";
import { CATEGORY_LABELS } from "@/lib/fred/irs/types";

interface RecommendationListProps {
  recommendations: Recommendation[];
  maxItems?: number;
  showRationale?: boolean;
  className?: string;
}

const difficultyConfig = {
  easy: {
    label: "Easy",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: Zap,
  },
  medium: {
    label: "Medium",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    icon: Clock,
  },
  hard: {
    label: "Hard",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    icon: AlertTriangle,
  },
};

const categoryColors: Record<IRSCategory, string> = {
  team: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  market: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  product: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  traction: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  financials: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  pitch: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

export function RecommendationList({
  recommendations,
  maxItems = 10,
  showRationale = true,
  className,
}: RecommendationListProps) {
  const displayRecs = recommendations.slice(0, maxItems);

  if (displayRecs.length === 0) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        No recommendations available
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {displayRecs.map((rec, index) => {
        const difficulty = difficultyConfig[rec.difficulty];
        const DifficultyIcon = difficulty.icon;

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-[#ff6a1a]/50 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              {/* Priority number */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#ff6a1a] text-white text-xs font-bold flex items-center justify-center">
                {rec.priority}
              </div>

              <div className="flex-1 min-w-0">
                {/* Action */}
                <p className="font-medium text-gray-900 dark:text-white">
                  {rec.action}
                </p>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {/* Category badge */}
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      categoryColors[rec.category]
                    )}
                  >
                    {CATEGORY_LABELS[rec.category]}
                  </span>

                  {/* Difficulty */}
                  <span
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded text-xs",
                      difficulty.bgColor,
                      difficulty.color
                    )}
                  >
                    <DifficultyIcon className="h-3 w-3" />
                    {difficulty.label}
                  </span>

                  {/* Timeframe */}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {rec.timeframe}
                  </span>
                </div>

                {/* Rationale */}
                {showRationale && rec.rationale && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {rec.rationale}
                  </p>
                )}

                {/* Impact */}
                {rec.impact && (
                  <div className="mt-2 flex items-center gap-1 text-sm text-[#ff6a1a]">
                    <ArrowRight className="h-3 w-3" />
                    <span>{rec.impact}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
