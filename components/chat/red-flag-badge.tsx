"use client";

import type { RedFlagCategory, Severity } from "@/lib/fred/types";
import { cn } from "@/lib/utils";

interface RedFlagBadgeProps {
  category: RedFlagCategory;
  severity: Severity;
  title: string;
}

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const CATEGORY_LABELS: Record<RedFlagCategory, string> = {
  market: "Market",
  financial: "Financial",
  team: "Team",
  product: "Product",
  legal: "Legal",
  competitive: "Competitive",
};

export function RedFlagBadge({ category, severity, title }: RedFlagBadgeProps) {
  const truncatedTitle = title.length > 40 ? title.substring(0, 37) + "..." : title;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border",
        SEVERITY_COLORS[severity]
      )}
      title={title}
    >
      <svg
        className="h-3 w-3 flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span className="font-medium">{CATEGORY_LABELS[category]}</span>
      <span className="opacity-70">{truncatedTitle}</span>
    </span>
  );
}
