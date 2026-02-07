"use client";

import { InvestorLensEvaluation } from "@/components/investor-lens";
import { FeatureLock } from "@/components/tier/feature-lock";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";

export default function InvestorLensPage() {
  const { tier, isLoading } = useUserTier();

  if (isLoading) return null;

  return (
    <FeatureLock
      requiredTier={UserTier.PRO}
      currentTier={tier}
      featureName="Investor Lens"
      description="Get AI-powered investor evaluation of your startup."
    >
      <InvestorLensEvaluation />
    </FeatureLock>
  );
}
