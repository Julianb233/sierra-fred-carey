"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useOnboarding } from "@/lib/hooks/use-onboarding";
import { ProgressIndicator } from "@/components/onboarding/progress-indicator";
import { WelcomeStep } from "@/components/onboarding/welcome-step";
import { StartupInfoStep } from "@/components/onboarding/startup-info-step";
import { FredIntroStep } from "@/components/onboarding/fred-intro-step";
import { CompleteStep } from "@/components/onboarding/complete-step";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  const {
    currentStep,
    completedSteps,
    startupInfo,
    isLoading,
    nextStep,
    prevStep,
    updateStartupInfo,
    completeStep,
    skipOnboarding,
  } = useOnboarding();

  // Check authentication - redirect to /get-started if not logged in
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/get-started");
        return;
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, [router]);

  // Loading state (auth check or onboarding state loading)
  if (!authChecked || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-orange-50/30 dark:from-gray-950 dark:to-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/20 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-[#ff6a1a]/10 rounded-full blur-[120px]"
          style={{ animationDuration: "10s" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-orange-400/10 rounded-full blur-[100px]"
          style={{ animationDuration: "12s" }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Image
              src="/sahara-logo.svg"
              alt="Sahara"
              width={100}
              height={24}
              className="h-6 w-auto opacity-80 hover:opacity-100 transition-opacity"
            />
          </Link>

          {currentStep !== "complete" && (
            <button
              onClick={skipOnboarding}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Skip setup
            </button>
          )}
        </div>
      </header>

      {/* Progress indicator */}
      {currentStep !== "complete" && (
        <div className="relative z-10 px-4 mb-8">
          <ProgressIndicator
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </div>
      )}

      {/* Main content */}
      <main className="relative z-10 px-4 pb-12">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {currentStep === "welcome" && (
              <WelcomeStep
                key="welcome"
                onNext={() => completeStep("welcome")}
                onSkip={skipOnboarding}
              />
            )}

            {currentStep === "startup-info" && (
              <StartupInfoStep
                key="startup-info"
                startupInfo={startupInfo}
                onUpdate={updateStartupInfo}
                onNext={() => completeStep("startup-info")}
                onBack={prevStep}
              />
            )}

            {currentStep === "fred-intro" && (
              <FredIntroStep
                key="fred-intro"
                startupInfo={startupInfo}
                onNext={() => completeStep("fred-intro")}
                onBack={prevStep}
              />
            )}

            {currentStep === "complete" && (
              <CompleteStep key="complete" startupName={startupInfo.name} />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
