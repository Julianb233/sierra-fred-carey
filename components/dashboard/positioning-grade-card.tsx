"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type PositioningGrade = "A" | "B" | "C" | "D" | "F";

interface PositioningGradeCardProps {
  grade: PositioningGrade | null;
  narrativeTightness: number | null;
  gaps: string[];
  onReassess: () => void;
  reassessing: boolean;
}

// ============================================================================
// Grade Config
// ============================================================================

const GRADE_CONFIG: Record<
  PositioningGrade,
  { color: string; bg: string; borderColor: string; description: string }
> = {
  A: {
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
    description: "Exceptional positioning. Clear, differentiated, compelling.",
  },
  B: {
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    description: "Strong positioning with minor refinements needed.",
  },
  C: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    description: "Adequate but lacks distinction. Room for improvement.",
  },
  D: {
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    description: "Weak positioning. Needs substantial work.",
  },
  F: {
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-200 dark:border-red-800",
    description: "Positioning needs fundamental rethinking.",
  },
};

// ============================================================================
// Component
// ============================================================================

export function PositioningGradeCard({
  grade,
  narrativeTightness,
  gaps,
  onReassess,
  reassessing,
}: PositioningGradeCardProps) {
  const config = grade ? GRADE_CONFIG[grade] : null;

  return (
    <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Positioning Readiness</CardTitle>
          {grade && (
            <Badge className={cn("text-xs", config?.bg, config?.color)}>
              Grade {grade}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {grade && config ? (
          <>
            {/* Grade + tightness display */}
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex items-center justify-center w-20 h-20 rounded-2xl text-4xl font-bold",
                  config.bg,
                  config.color
                )}
              >
                {grade}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {config.description}
                </p>
                {narrativeTightness !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500">
                        Narrative Tightness
                      </span>
                      <span className={cn("text-xs font-bold", config.color)}>
                        {narrativeTightness}/10
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          narrativeTightness >= 7
                            ? "bg-green-500"
                            : narrativeTightness >= 5
                            ? "bg-amber-500"
                            : "bg-red-500"
                        )}
                        style={{ width: `${narrativeTightness * 10}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Key gaps */}
            {gaps.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Key Gaps
                </p>
                <div className="space-y-1.5">
                  {gaps.slice(0, 5).map((gap, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <span>{gap}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No positioning assessment yet. Run an assessment to get your grade
            and identify gaps.
          </p>
        )}

        {/* Reassess button */}
        <Button
          variant="outline"
          onClick={onReassess}
          disabled={reassessing}
          className="w-full border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/5"
        >
          {reassessing ? "Reassessing..." : "Reassess Positioning"}
        </Button>
      </CardContent>
    </Card>
  );
}
