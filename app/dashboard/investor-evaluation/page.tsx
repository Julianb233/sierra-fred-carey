"use client";

import { Loader2 } from "lucide-react";
import { FeatureLock } from "@/components/tier/feature-lock";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";
import { InvestorEvaluation } from "@/components/diagnostic/InvestorEvaluation";

export default function InvestorEvaluationPage() {
  const { tier, isLoading: isTierLoading } = useUserTier();

  if (isTierLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <FeatureLock
      requiredTier={UserTier.PRO}
      currentTier={tier}
      featureName="Investor Evaluation"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investor Evaluation</h1>
          <p className="text-muted-foreground mt-1">
            Get an IC-style evaluation of your startup using the Investor Lens framework.
          </p>
        </div>
        <InvestorEvaluation />
      </div>
    </FeatureLock>
  );
}
