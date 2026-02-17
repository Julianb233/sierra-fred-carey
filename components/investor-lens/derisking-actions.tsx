"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle, Circle, ArrowRight, Target } from "lucide-react";

export interface DeriskingAction {
  id: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  timeframe: "week_1" | "week_2" | "week_3" | "week_4";
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  status: "not_started" | "in_progress" | "completed";
  relatedConcern?: string;
}

interface DeriskingActionsProps {
  actions: DeriskingAction[];
  onUpdateStatus?: (actionId: string, status: DeriskingAction["status"]) => void;
}

const priorityConfig = {
  critical: { color: "text-red-600", bgColor: "bg-red-500/10", borderColor: "border-red-500/30" },
  high: { color: "text-orange-600", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30" },
  medium: { color: "text-amber-600", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30" },
  low: { color: "text-blue-600", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
};

const timeframeLabels = {
  week_1: "Week 1",
  week_2: "Week 2",
  week_3: "Week 3",
  week_4: "Week 4",
};

const effortImpactConfig = {
  low: "bg-gray-200 dark:bg-gray-700",
  medium: "bg-amber-400",
  high: "bg-green-400",
};

export function DeriskingActions({ actions, onUpdateStatus }: DeriskingActionsProps) {
  const groupedByWeek = actions.reduce((acc, action) => {
    if (!acc[action.timeframe]) {
      acc[action.timeframe] = [];
    }
    acc[action.timeframe].push(action);
    return acc;
  }, {} as Record<string, DeriskingAction[]>);

  const weeks = ["week_1", "week_2", "week_3", "week_4"] as const;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-[#ff6a1a]" />
          <CardTitle className="text-lg">30-Day De-risking Plan</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Priority actions to strengthen your investor profile
        </p>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              No critical de-risking actions needed.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {weeks.map((week, weekIndex) => {
              const weekActions = groupedByWeek[week] || [];
              if (weekActions.length === 0) return null;

              return (
                <motion.div
                  key={week}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: weekIndex * 0.1 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-[#ff6a1a]" />
                    <h4 className="font-semibold text-sm">{timeframeLabels[week]}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {weekActions.length} actions
                    </Badge>
                  </div>

                  <div className="space-y-2 pl-6 border-l-2 border-[#ff6a1a]/20">
                    {weekActions.map((action, actionIndex) => {
                      const config = priorityConfig[action.priority];

                      return (
                        <motion.div
                          key={action.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: weekIndex * 0.1 + actionIndex * 0.05 }}
                          className={cn(
                            "p-4 rounded-lg border transition-all hover:shadow-md",
                            action.status === "completed"
                              ? "bg-green-500/5 border-green-500/20"
                              : "bg-card"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Status Icon */}
                            <button
                              onClick={() => onUpdateStatus?.(
                                action.id,
                                action.status === "completed" ? "not_started" : "completed"
                              )}
                              className="mt-0.5 shrink-0"
                            >
                              {action.status === "completed" ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : action.status === "in_progress" ? (
                                <Clock className="h-5 w-5 text-amber-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-300" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={cn("text-xs", config.color, config.borderColor)}
                                >
                                  {action.priority}
                                </Badge>
                              </div>

                              <p className={cn(
                                "text-sm mb-2",
                                action.status === "completed" && "line-through text-muted-foreground"
                              )}>
                                {action.description}
                              </p>

                              {action.relatedConcern && (
                                <p className="text-xs text-muted-foreground mb-2">
                                  Addresses: {action.relatedConcern}
                                </p>
                              )}

                              {/* Effort/Impact Indicators */}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <span>Effort:</span>
                                  <div className="flex gap-0.5">
                                    {["low", "medium", "high"].map((level) => (
                                      <div
                                        key={level}
                                        className={cn(
                                          "w-2 h-2 rounded-full",
                                          ["low", "medium", "high"].indexOf(level) <=
                                            ["low", "medium", "high"].indexOf(action.effort)
                                            ? "bg-[#ff6a1a]"
                                            : "bg-gray-200 dark:bg-gray-700"
                                        )}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span>Impact:</span>
                                  <div className="flex gap-0.5">
                                    {["low", "medium", "high"].map((level) => (
                                      <div
                                        key={level}
                                        className={cn(
                                          "w-2 h-2 rounded-full",
                                          ["low", "medium", "high"].indexOf(level) <=
                                            ["low", "medium", "high"].indexOf(action.impact)
                                            ? "bg-green-500"
                                            : "bg-gray-200 dark:bg-gray-700"
                                        )}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
