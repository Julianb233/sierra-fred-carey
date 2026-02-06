"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Users, TrendingUp, Package, BarChart3, DollarSign, Presentation } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IRSCategory, CategoryScore } from "@/lib/fred/irs/types";
import { CATEGORY_LABELS, CATEGORY_WEIGHTS } from "@/lib/fred/irs/types";

interface CategoryBreakdownProps {
  categories: Record<IRSCategory, CategoryScore>;
  expandable?: boolean;
  className?: string;
}

const categoryIcons: Record<IRSCategory, typeof Users> = {
  team: Users,
  market: TrendingUp,
  product: Package,
  traction: BarChart3,
  financials: DollarSign,
  pitch: Presentation,
};

const getScoreColor = (score: number) => {
  if (score < 30) return "bg-red-500";
  if (score < 50) return "bg-orange-500";
  if (score < 70) return "bg-yellow-500";
  if (score < 85) return "bg-green-500";
  return "bg-emerald-500";
};

const getScoreTextColor = (score: number) => {
  if (score < 30) return "text-red-600 dark:text-red-400";
  if (score < 50) return "text-orange-600 dark:text-orange-400";
  if (score < 70) return "text-yellow-600 dark:text-yellow-400";
  if (score < 85) return "text-green-600 dark:text-green-400";
  return "text-emerald-600 dark:text-emerald-400";
};

export function CategoryBreakdown({
  categories,
  expandable = true,
  className,
}: CategoryBreakdownProps) {
  const [expandedCategory, setExpandedCategory] = useState<IRSCategory | null>(null);

  const categoryOrder: IRSCategory[] = ['team', 'market', 'product', 'traction', 'financials', 'pitch'];

  return (
    <div className={cn("space-y-3", className)}>
      {categoryOrder.map((category) => {
        const data = categories[category];
        const Icon = categoryIcons[category];
        const isExpanded = expandedCategory === category;

        return (
          <div
            key={category}
            className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Category header */}
            <button
              onClick={() => expandable && setExpandedCategory(isExpanded ? null : category)}
              className={cn(
                "w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                expandable && "cursor-pointer"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                getScoreColor(data.score),
                "bg-opacity-20"
              )}>
                <Icon className={cn("h-4 w-4", getScoreTextColor(data.score))} />
              </div>

              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-bold", getScoreTextColor(data.score))}>
                      {data.score}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({Math.round(CATEGORY_WEIGHTS[category] * 100)}%)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", getScoreColor(data.score))}
                    initial={{ width: 0 }}
                    animate={{ width: `${data.score}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>

              {expandable && (
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-gray-400 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              )}
            </button>

            {/* Expanded content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200 dark:border-gray-700"
                >
                  <div className="p-4 space-y-4">
                    {/* Feedback */}
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {data.feedback}
                    </p>

                    {/* Positives */}
                    {data.positives.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-green-600 dark:text-green-400 uppercase mb-2">
                          Strengths
                        </h4>
                        <ul className="space-y-1">
                          {data.positives.map((positive, i) => (
                            <li
                              key={i}
                              className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                            >
                              <span className="text-green-500 mt-1">+</span>
                              {positive}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Gaps */}
                    {data.gaps.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-red-600 dark:text-red-400 uppercase mb-2">
                          Gaps
                        </h4>
                        <ul className="space-y-1">
                          {data.gaps.map((gap, i) => (
                            <li
                              key={i}
                              className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                            >
                              <span className="text-red-500 mt-1">-</span>
                              {gap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Confidence */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Confidence:</span>
                      <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${data.confidence * 100}%` }}
                        />
                      </div>
                      <span>{Math.round(data.confidence * 100)}%</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
