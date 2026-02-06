"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingStep } from "@/lib/hooks/use-onboarding";

interface ProgressIndicatorProps {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  className?: string;
}

const STEP_INFO: Record<OnboardingStep, { label: string; shortLabel: string }> = {
  welcome: { label: "Welcome", shortLabel: "Welcome" },
  "startup-info": { label: "Your Startup", shortLabel: "Startup" },
  "fred-intro": { label: "Meet FRED", shortLabel: "FRED" },
  complete: { label: "Complete", shortLabel: "Done" },
};

const STEPS: OnboardingStep[] = ["welcome", "startup-info", "fred-intro", "complete"];

export function ProgressIndicator({
  currentStep,
  completedSteps,
  className,
}: ProgressIndicatorProps) {
  const currentIndex = STEPS.indexOf(currentStep);

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isActive = step === currentStep;
          const isComplete = completedSteps.includes(step) || index < currentIndex;
          const isPending = !isActive && !isComplete;
          const info = STEP_INFO[step];

          return (
            <div key={step} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    backgroundColor: isComplete
                      ? "#ff6a1a"
                      : isActive
                      ? "#ff6a1a"
                      : "#e5e7eb",
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    "transition-colors duration-200",
                    isComplete && "bg-[#ff6a1a] text-white",
                    isActive && "bg-[#ff6a1a] text-white ring-4 ring-[#ff6a1a]/20",
                    isPending && "bg-gray-200 dark:bg-gray-700 text-gray-500"
                  )}
                >
                  {isComplete && step !== currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </motion.div>

                {/* Step label */}
                <span
                  className={cn(
                    "mt-2 text-xs font-medium transition-colors",
                    isActive && "text-[#ff6a1a]",
                    isComplete && "text-gray-600 dark:text-gray-400",
                    isPending && "text-gray-400 dark:text-gray-500"
                  )}
                >
                  <span className="hidden sm:inline">{info.label}</span>
                  <span className="sm:hidden">{info.shortLabel}</span>
                </span>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-2 relative">
                  <div className="h-0.5 bg-gray-200 dark:bg-gray-700" />
                  <motion.div
                    initial={false}
                    animate={{
                      width: index < currentIndex ? "100%" : "0%",
                    }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-y-0 left-0 h-0.5 bg-[#ff6a1a]"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact progress bar variant
 */
export function ProgressBar({
  progress,
  className,
}: {
  progress: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
          className="h-full bg-gradient-to-r from-[#ff6a1a] to-orange-400 rounded-full"
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-500">{progress}% complete</span>
      </div>
    </div>
  );
}
