"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerationProgressProps {
  sectionNames: string[];
  currentSection: number;
  isGenerating: boolean;
}

export function GenerationProgress({
  sectionNames,
  currentSection,
  isGenerating,
}: GenerationProgressProps) {
  const progressPercent = Math.min(
    Math.round((currentSection / sectionNames.length) * 100),
    100
  );

  return (
    <div className="space-y-4">
      {isGenerating && (
        <div className="flex items-center gap-2 text-[#ff6a1a] font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>FRED is writing...</span>
        </div>
      )}

      {/* Vertical stepper */}
      <div className="space-y-3">
        {sectionNames.map((name, index) => {
          const isCompleted = index < currentSection;
          const isCurrent = index === currentSection && isGenerating;
          const isPending = index > currentSection || (!isGenerating && index === currentSection);

          return (
            <div key={index} className="flex items-center gap-3">
              {/* Status icon */}
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              ) : isCurrent ? (
                <div className="w-5 h-5 rounded-full bg-[#ff6a1a] flex items-center justify-center shrink-0">
                  <Loader2 className="w-3 h-3 text-white animate-spin" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 shrink-0" />
              )}

              {/* Section name */}
              <span
                className={cn(
                  "text-sm",
                  isCompleted && "text-gray-700 dark:text-gray-300",
                  isCurrent && "font-bold text-gray-900 dark:text-white",
                  isPending && "text-gray-400 dark:text-gray-500"
                )}
              >
                {name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Overall progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-[#ff6a1a] h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
