"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, Target, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";

export interface Gap {
  id: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  impact: string;
}

export interface Action {
  id: string;
  description: string;
  priority: number;
  timeframe: string;
  relatedGap?: string;
  expectedImpact: string;
}

interface GapsAndActionsProps {
  gaps: Gap[];
  actions: Action[];
}

const severityConfig = {
  critical: {
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    label: "Critical",
  },
  high: {
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    label: "High",
  },
  medium: {
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    label: "Medium",
  },
  low: {
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    label: "Low",
  },
};

export function GapsAndActions({ gaps, actions }: GapsAndActionsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Gaps Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Identified Gaps</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {gaps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No significant gaps identified.
            </p>
          ) : (
            <div className="space-y-3">
              {gaps.map((gap, index) => {
                const config = severityConfig[gap.severity];
                return (
                  <motion.div
                    key={gap.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "p-3 rounded-lg border",
                      config.bgColor,
                      config.borderColor
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", config.color, config.borderColor)}
                      >
                        {config.label}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {gap.category}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-1">{gap.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Impact: {gap.impact}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-[#ff6a1a]" />
            <CardTitle className="text-lg">Next Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No actions needed at this time.
            </p>
          ) : (
            <div className="space-y-3">
              {actions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#ff6a1a]/10 text-[#ff6a1a] text-xs font-bold shrink-0">
                      {action.priority}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1">{action.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {action.timeframe}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Lightbulb className="h-3 w-3" />
                          {action.expectedImpact}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
