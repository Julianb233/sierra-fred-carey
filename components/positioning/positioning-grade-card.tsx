"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type Grade = "A" | "B" | "C" | "D" | "F";

interface PositioningGradeCardProps {
  grade: Grade;
  narrativeTightnessScore: number;
  summary: string;
}

const gradeConfig: Record<Grade, { color: string; bgColor: string; borderColor: string; description: string }> = {
  A: {
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    description: "Exceptional positioning. Your narrative is clear, differentiated, and compelling.",
  },
  B: {
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    description: "Strong positioning with minor gaps. A few refinements will sharpen your story.",
  },
  C: {
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    description: "Adequate positioning but lacks distinction. Significant room for improvement.",
  },
  D: {
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    description: "Weak positioning. Your narrative needs substantial work to resonate with investors.",
  },
  F: {
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    description: "Positioning needs fundamental rethinking. Start with the basics.",
  },
};

export function PositioningGradeCard({ grade, narrativeTightnessScore, summary }: PositioningGradeCardProps) {
  const config = gradeConfig[grade];

  return (
    <Card className={cn("overflow-hidden border-2", config.borderColor)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Overall Positioning Grade</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Large Grade Display */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className={cn(
              "flex items-center justify-center w-24 h-24 rounded-2xl text-5xl font-bold",
              config.bgColor,
              config.color
            )}
          >
            {grade}
          </motion.div>

          <div className="flex-1 space-y-3">
            {/* Narrative Tightness Score */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-muted-foreground">Narrative Tightness</span>
                <span className={cn("text-sm font-bold", config.color)}>{narrativeTightnessScore}/10</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${narrativeTightnessScore * 10}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className={cn("h-full rounded-full", config.bgColor.replace("/10", "/60"))}
                />
              </div>
            </div>

            {/* Summary */}
            <p className="text-sm text-muted-foreground">{summary || config.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
