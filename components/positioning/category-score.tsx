"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Grade } from "./positioning-grade-card";

export interface CategoryScoreData {
  name: string;
  weight: number;
  score: number;
  grade: Grade;
  checklist: Array<{
    item: string;
    status: "pass" | "fail" | "partial";
    feedback?: string;
  }>;
  feedback: string;
}

interface CategoryScoreProps {
  category: CategoryScoreData;
}

const gradeColors: Record<Grade, string> = {
  A: "text-green-600 bg-green-500/10 border-green-500/30",
  B: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
  C: "text-amber-600 bg-amber-500/10 border-amber-500/30",
  D: "text-orange-600 bg-orange-500/10 border-orange-500/30",
  F: "text-red-600 bg-red-500/10 border-red-500/30",
};

const scoreColors = {
  high: "bg-green-500",
  medium: "bg-amber-500",
  low: "bg-red-500",
};

const getScoreLevel = (score: number) => {
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
};

const statusConfig = {
  pass: {
    icon: CheckCircle,
    color: "text-green-500",
    label: "Pass",
  },
  fail: {
    icon: XCircle,
    color: "text-red-500",
    label: "Fail",
  },
  partial: {
    icon: AlertTriangle,
    color: "text-amber-500",
    label: "Partial",
  },
};

export function CategoryScore({ category }: CategoryScoreProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const scoreLevel = getScoreLevel(category.score);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{category.name}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {category.weight}% weight
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{category.score}%</span>
            <Badge
              variant="outline"
              className={cn("text-xs font-bold", gradeColors[category.grade])}
            >
              {category.grade}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <Progress
          value={category.score}
          className="h-2"
          indicatorClassName={scoreColors[scoreLevel]}
        />

        {/* Quick Feedback */}
        <p className="text-sm text-muted-foreground">{category.feedback}</p>

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-[#ff6a1a] hover:text-[#ea580c] hover:bg-[#ff6a1a]/5"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>{isExpanded ? "Hide checklist" : "View checklist"}</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {/* Checklist Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pt-2 border-t">
                {category.checklist.map((item, index) => {
                  const StatusIcon = statusConfig[item.status].icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-900"
                    >
                      <StatusIcon className={cn("h-5 w-5 mt-0.5 shrink-0", statusConfig[item.status].color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.item}</p>
                        {item.feedback && (
                          <p className="text-xs text-muted-foreground mt-1">{item.feedback}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
