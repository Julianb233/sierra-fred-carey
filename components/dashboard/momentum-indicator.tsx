"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MomentumIndicatorProps {
  trend: "rising" | "stable" | "declining";
  summary: string;
  compact?: boolean;
}

const TREND_CONFIG = {
  rising: {
    Icon: TrendingUp,
    iconColor: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  stable: {
    Icon: Minus,
    iconColor: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  declining: {
    Icon: TrendingDown,
    iconColor: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
};

export function MomentumIndicator({
  trend,
  summary,
  compact = false,
}: MomentumIndicatorProps) {
  const config = TREND_CONFIG[trend];
  const { Icon } = config;

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center ${config.bgColor}`}
        >
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
        </div>
        <span className="text-sm text-muted-foreground">{summary}</span>
      </div>
    );
  }

  return (
    <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bgColor}`}
        >
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>
        <div>
          <p className="text-sm font-medium capitalize">{trend} momentum</p>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
      </CardContent>
    </Card>
  );
}
