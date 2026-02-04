"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useEffect } from "react";

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
  size?: number;
  label?: string;
  animate?: boolean;
}

export function ScoreGauge({
  score,
  maxScore = 100,
  size = 200,
  label,
  animate = true,
}: ScoreGaugeProps) {
  const controls = useAnimationControls();
  const percentage = (score / maxScore) * 100;
  const circumference = 2 * Math.PI * 85;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct >= 80) return { from: "#10b981", to: "#059669" };
    if (pct >= 60) return { from: "#3b82f6", to: "#2563eb" };
    if (pct >= 40) return { from: "#f59e0b", to: "#d97706" };
    return { from: "#ef4444", to: "#dc2626" };
  };

  const colors = getColor(percentage);

  useEffect(() => {
    if (animate) {
      controls.start({
        strokeDashoffset,
        transition: { duration: 2, ease: "easeOut" },
      });
    }
  }, [strokeDashoffset, animate, controls]);

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient
            id={`gradient-${label || "score"}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={colors.from} />
            <stop offset="100%" stopColor={colors.to} />
          </linearGradient>
          <filter id={`glow-${label || "score"}`}>
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle
          cx="100"
          cy="100"
          r="85"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="12"
          className="dark:stroke-white/10"
        />

        {/* Progress circle */}
        <motion.circle
          cx="100"
          cy="100"
          r="85"
          fill="none"
          stroke={`url(#gradient-${label || "score"})`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={controls}
          filter={`url(#glow-${label || "score"})`}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="text-center"
        >
          <div className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
            {Math.round(score)}
          </div>
          {label && (
            <div className="text-sm text-muted-foreground mt-1">{label}</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
