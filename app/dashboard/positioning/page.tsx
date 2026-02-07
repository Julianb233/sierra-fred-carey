"use client";

import { PositioningAssessment } from "@/components/positioning";
import { FeatureLock } from "@/components/tier/feature-lock";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";

export default function PositioningPage() {
  const { tier, isLoading } = useUserTier();

  if (isLoading) return null;

  return (
    <FeatureLock
      requiredTier={UserTier.PRO}
      currentTier={tier}
      featureName="Positioning Assessment"
      description="Evaluate your market positioning with AI-powered analysis."
    >
      <PositioningAssessment />
    </FeatureLock>
  );
}
