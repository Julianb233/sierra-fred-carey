"use client";

import Link from "next/link";
import { useTier } from "@/lib/context/tier-context";
import { useGetStartedSteps, type GetStartedStep } from "@/lib/hooks/use-get-started-steps";
import { cn } from "@/lib/utils";

function CheckIcon() {
  return (
    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function StepCircle({ step, isNext }: { step: GetStartedStep; isNext: boolean }) {
  if (step.completed) {
    return (
      <div className="h-7 w-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
        <CheckIcon />
      </div>
    );
  }

  if (step.isOptional) {
    return (
      <div className={cn(
        "h-7 w-7 rounded-full flex items-center justify-center shrink-0 border-2",
        "border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500"
      )}>
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn(
      "h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold border-2",
      isNext
        ? "border-[#ff6a1a] bg-[#ff6a1a]/10 text-[#ff6a1a]"
        : "border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500"
    )}>
      {String(step.number)}
    </div>
  );
}

function StepRow({
  step,
  isNext,
  isMobile,
}: {
  step: GetStartedStep;
  isNext: boolean;
  isMobile: boolean;
}) {
  return (
    <div className={cn(
      "flex items-start gap-3 py-3",
      isMobile && "flex-col gap-2"
    )}>
      <div className={cn("flex items-start gap-3 flex-1 min-w-0", isMobile && "w-full")}>
        <StepCircle step={step} isNext={isNext} />
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium leading-snug",
            step.completed
              ? "text-gray-400 dark:text-gray-500"
              : isNext
                ? "text-gray-900 dark:text-white font-semibold"
                : "text-gray-700 dark:text-gray-300"
          )}>
            {step.label}
          </p>
          <p className={cn(
            "text-xs mt-0.5 leading-relaxed",
            step.completed
              ? "text-gray-400 dark:text-gray-600"
              : "text-gray-500 dark:text-gray-400"
          )}>
            {step.description}
          </p>
        </div>
      </div>

      {/* CTA / Status */}
      <div className={cn("shrink-0", isMobile && "w-full pl-10")}>
        {step.completed ? (
          <span className="text-xs font-medium text-green-600 dark:text-green-400">
            {step.isOptional && step.completed ? "Unlocked" : "Done"}
          </span>
        ) : (
          <Link
            href={step.href}
            className={cn(
              "inline-flex items-center justify-center text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors",
              isNext
                ? "bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-sm"
                : step.isOptional
                  ? "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  : "bg-[#ff6a1a]/10 hover:bg-[#ff6a1a]/20 text-[#ff6a1a]",
              isMobile && "w-full py-2"
            )}
          >
            {step.cta}
          </Link>
        )}
      </div>
    </div>
  );
}

export function GetStartedWithFred({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const { tier } = useTier();
  const { steps, completedCount, coreStepCount, allCoreComplete, isLoading } =
    useGetStartedSteps(tier);

  // Auto-hide when all 3 core steps are complete
  if (allCoreComplete || isLoading) return null;

  const isMobile = variant === "mobile";
  const progressPercent = Math.round((completedCount / coreStepCount) * 100);
  const coreSteps = steps.filter((s) => !s.isOptional);
  const optionalSteps = steps.filter((s) => s.isOptional);

  // Find the first incomplete core step
  const nextStepId = coreSteps.find((s) => !s.completed)?.id;

  return (
    <div className={cn(
      "rounded-2xl border-2 border-[#ff6a1a]/30 bg-gradient-to-br from-[#ff6a1a]/5 to-orange-50/50 dark:from-[#ff6a1a]/10 dark:to-gray-900/50 overflow-hidden",
      isMobile ? "p-4" : "p-6"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="rocket">
            &#x1F680;
          </span>
          <h3 className={cn(
            "font-bold text-gray-900 dark:text-white",
            isMobile ? "text-base" : "text-lg"
          )}>
            Get Started with Fred
          </h3>
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {completedCount} of {coreStepCount} done
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#ff6a1a] to-orange-400 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Core steps */}
      <div className="divide-y divide-gray-200/60 dark:divide-gray-700/60">
        {coreSteps.map((step) => (
          <StepRow
            key={step.id}
            step={step}
            isNext={step.id === nextStepId}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* Separator */}
      <div className="my-3 border-t-2 border-dashed border-gray-200 dark:border-gray-700" />

      {/* Optional steps */}
      <div className="opacity-75">
        {optionalSteps.map((step) => (
          <StepRow
            key={step.id}
            step={step}
            isNext={false}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
}
