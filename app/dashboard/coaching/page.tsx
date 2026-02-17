"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { FeatureLock } from "@/components/tier/feature-lock";
import { CoachingLayout } from "@/components/coaching/coaching-layout";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";

// ============================================================================
// Loading Fallback
// ============================================================================

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
    </div>
  );
}

// ============================================================================
// Page Content
// ============================================================================

function CoachingPageContent() {
  const { tier, isLoading } = useUserTier();

  if (isLoading) {
    return <LoadingFallback />;
  }

  return (
    <FeatureLock
      requiredTier={UserTier.STUDIO}
      currentTier={tier}
      featureName="Video Coaching"
      description="Live video coaching sessions with real-time FRED AI assistance. Available on Studio tier."
    >
      <CoachingContent />
    </FeatureLock>
  );
}

// ============================================================================
// Inner Content (only rendered when tier check passes)
// ============================================================================

function CoachingContent() {
  // In a real app, userId comes from auth context.
  // We use a placeholder that the VideoRoom will resolve via the token API.
  // The token API uses requireAuth() to get the real userId.
  const userId = typeof window !== "undefined"
    ? (sessionStorage.getItem("sahara-user-id") || "user")
    : "user";

  return <CoachingLayout userId={userId} />;
}

// ============================================================================
// Export
// ============================================================================

export default function CoachingPage() {
  return (
    <div data-testid="coaching-page">
      <Suspense fallback={<LoadingFallback />}>
        <CoachingPageContent />
      </Suspense>
    </div>
  );
}
