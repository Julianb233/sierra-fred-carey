"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { width: 80, strokeWidth: 6, fontSize: "text-lg" },
  md: { width: 120, strokeWidth: 8, fontSize: "text-2xl" },
  lg: { width: 180, strokeWidth: 10, fontSize: "text-4xl" },
};

export function ScoreGauge({
  score,
  size = "md",
  showLabel = true,
  label,
  animated = true,
  className,
}: ScoreGaugeProps) {
  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  // Determine color based on score
  const getColor = (score: number) => {
    if (score < 30) return "#ef4444"; // red
    if (score < 50) return "#f97316"; // orange
    if (score < 70) return "#eab308"; // yellow
    if (score < 85) return "#22c55e"; // green
    return "#10b981"; // emerald
  };

  const color = getColor(score);

  // Get readiness label
  const getReadinessLabel = (score: number) => {
    if (score < 30) return "Not Ready";
    if (score < 50) return "Early Stage";
    if (score < 70) return "Developing";
    if (score < 85) return "Ready";
    return "Highly Ready";
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: config.width, height: config.width }}>
        {/* Background circle */}
        <svg
          className="absolute inset-0 -rotate-90"
          width={config.width}
          height={config.width}
        >
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-gray-200 dark:text-gray-700"
          />
        </svg>

        {/* Progress circle */}
        <svg
          className="absolute inset-0 -rotate-90"
          width={config.width}
          height={config.width}
        >
          <motion.circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>

        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={cn("font-bold", config.fontSize)}
            style={{ color }}
            initial={animated ? { opacity: 0 } : { opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
          {size !== "sm" && (
            <span className="text-xs text-gray-500 dark:text-gray-400">/ 100</span>
          )}
        </div>
      </div>

      {showLabel && (
        <div className="mt-2 text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {label || getReadinessLabel(score)}
          </p>
        </div>
      )}
    </div>
  );
}
