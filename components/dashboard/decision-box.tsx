"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertCircle } from "lucide-react";
import type { CurrentStepInfo, ProcessProgressData } from "@/lib/dashboard/command-center";

// ============================================================================
// Component
// ============================================================================

interface DecisionBoxProps {
  currentStep: CurrentStepInfo;
  processProgress: ProcessProgressData;
}

export function DecisionBox({ currentStep, processProgress }: DecisionBoxProps) {
  const progressPercent = Math.round(
    (processProgress.completedSteps / processProgress.totalSteps) * 100
  );

  return (
    <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Right Now</CardTitle>
          <Badge variant="outline" className="text-xs">
            Step {currentStep.stepNumber} of {processProgress.totalSteps}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Process Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#ff6a1a] transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Current step info */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {currentStep.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {currentStep.objective}
          </p>
        </div>

        {/* Blockers */}
        {currentStep.blockers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
              Blockers
            </p>
            <div className="space-y-1.5">
              {currentStep.blockers.map((blocker, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span>{blocker}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA Button */}
        <Link href="/chat" className="block">
          <Button className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
            Work on this with Fred
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
