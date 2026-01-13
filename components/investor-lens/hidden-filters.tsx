"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Scale,
  Users,
  Zap,
  Clock,
  Layers,
} from "lucide-react";

export interface HiddenFilter {
  name: string;
  description: string;
  status: "detected" | "not_detected" | "uncertain";
  explanation: string;
  mitigation?: string;
  icon: string;
}

interface HiddenFiltersProps {
  filters: HiddenFilter[];
}

const iconMap: Record<string, typeof AlertCircle> = {
  outcome_size: Scale,
  weak_sponsor: Users,
  pattern_bias: Eye,
  momentum_gap: Zap,
  complexity_cost: Layers,
  timing: Clock,
};

const statusConfig = {
  detected: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    label: "Detected",
  },
  not_detected: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    label: "Clear",
  },
  uncertain: {
    icon: AlertCircle,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    label: "Uncertain",
  },
};

export function HiddenFilters({ filters }: HiddenFiltersProps) {
  const detectedCount = filters.filter((f) => f.status === "detected").length;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Unspoken VC Filters</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Common reasons VCs pass that are rarely discussed openly
            </p>
          </div>
          {detectedCount > 0 && (
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
              {detectedCount} Detected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filters.map((filter, index) => {
            const FilterIcon = iconMap[filter.icon] || AlertCircle;
            const config = statusConfig[filter.status];
            const StatusIcon = config.icon;

            return (
              <motion.div
                key={filter.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  config.borderColor,
                  config.bgColor
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg shrink-0", config.bgColor)}>
                    <FilterIcon className={cn("h-4 w-4", config.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-medium text-sm">{filter.name}</h4>
                      <Badge
                        variant="outline"
                        className={cn("text-xs shrink-0", config.color, config.borderColor)}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground mb-2">
                      {filter.description}
                    </p>

                    <div className={cn(
                      "p-2 rounded text-xs",
                      filter.status === "detected"
                        ? "bg-red-500/5 text-red-700 dark:text-red-400"
                        : filter.status === "uncertain"
                        ? "bg-amber-500/5 text-amber-700 dark:text-amber-400"
                        : "bg-green-500/5 text-green-700 dark:text-green-400"
                    )}>
                      <p className="font-medium mb-1">
                        {filter.status === "detected" ? "Why this matters:" : "Assessment:"}
                      </p>
                      <p>{filter.explanation}</p>
                    </div>

                    {filter.mitigation && filter.status === "detected" && (
                      <div className="mt-2 p-2 rounded bg-gray-50 dark:bg-gray-900 text-xs">
                        <p className="font-medium text-[#ff6a1a] mb-1">How to address:</p>
                        <p className="text-muted-foreground">{filter.mitigation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
