"use client";

import { useState, useEffect, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export type OnboardingStep =
  | "welcome"
  | "startup-info"
  | "fred-intro"
  | "complete";

export interface StartupInfo {
  name?: string;
  stage?: "idea" | "mvp" | "pre-seed" | "seed" | "series-a";
  industry?: string;
  description?: string;
  mainChallenge?: string;
  goals?: string[];
}

export interface OnboardingState {
  currentStep: OnboardingStep;
  startupInfo: StartupInfo;
  completedSteps: OnboardingStep[];
  isComplete: boolean;
  startedAt?: string;
  completedAt?: string;
}

const STEPS: OnboardingStep[] = ["welcome", "startup-info", "fred-intro", "complete"];
const STORAGE_KEY = "sahara-onboarding";

// ============================================================================
// Hook
// ============================================================================

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>({
    currentStep: "welcome",
    startupInfo: {},
    completedSteps: [],
    isComplete: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as OnboardingState;
        setState(parsed);
      }
    } catch (error) {
      console.error("[useOnboarding] Error loading state:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Persist state to localStorage
  const persistState = useCallback((newState: OnboardingState) => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.error("[useOnboarding] Error saving state:", error);
    }
  }, []);

  // Go to next step
  const nextStep = useCallback(() => {
    setState((prev) => {
      const currentIndex = STEPS.indexOf(prev.currentStep);
      if (currentIndex < STEPS.length - 1) {
        const nextStepValue = STEPS[currentIndex + 1];
        const newState: OnboardingState = {
          ...prev,
          currentStep: nextStepValue,
          completedSteps: [...new Set([...prev.completedSteps, prev.currentStep])],
          isComplete: nextStepValue === "complete",
          completedAt: nextStepValue === "complete" ? new Date().toISOString() : prev.completedAt,
        };
        persistState(newState);
        return newState;
      }
      return prev;
    });
  }, [persistState]);

  // Go to previous step
  const prevStep = useCallback(() => {
    setState((prev) => {
      const currentIndex = STEPS.indexOf(prev.currentStep);
      if (currentIndex > 0) {
        const newState: OnboardingState = {
          ...prev,
          currentStep: STEPS[currentIndex - 1],
        };
        persistState(newState);
        return newState;
      }
      return prev;
    });
  }, [persistState]);

  // Go to specific step
  const goToStep = useCallback(
    (step: OnboardingStep) => {
      setState((prev) => {
        const newState: OnboardingState = {
          ...prev,
          currentStep: step,
        };
        persistState(newState);
        return newState;
      });
    },
    [persistState]
  );

  // Update startup info
  const updateStartupInfo = useCallback(
    (info: Partial<StartupInfo>) => {
      setState((prev) => {
        const newState: OnboardingState = {
          ...prev,
          startupInfo: { ...prev.startupInfo, ...info },
        };
        persistState(newState);
        return newState;
      });
    },
    [persistState]
  );

  // Mark a step as complete and go to next
  const completeStep = useCallback(
    (step: OnboardingStep) => {
      setState((prev) => {
        const currentIndex = STEPS.indexOf(step);
        const nextStepValue = currentIndex < STEPS.length - 1 ? STEPS[currentIndex + 1] : step;

        const newState: OnboardingState = {
          ...prev,
          currentStep: nextStepValue,
          completedSteps: [...new Set([...prev.completedSteps, step])],
          isComplete: nextStepValue === "complete",
          completedAt: nextStepValue === "complete" ? new Date().toISOString() : prev.completedAt,
          startedAt: prev.startedAt || new Date().toISOString(),
        };
        persistState(newState);
        return newState;
      });
    },
    [persistState]
  );

  // Skip onboarding entirely
  const skipOnboarding = useCallback(() => {
    const newState: OnboardingState = {
      currentStep: "complete",
      startupInfo: {},
      completedSteps: STEPS,
      isComplete: true,
      completedAt: new Date().toISOString(),
    };
    setState(newState);
    persistState(newState);
  }, [persistState]);

  // Reset onboarding
  const resetOnboarding = useCallback(() => {
    const newState: OnboardingState = {
      currentStep: "welcome",
      startupInfo: {},
      completedSteps: [],
      isComplete: false,
    };
    setState(newState);
    persistState(newState);
  }, [persistState]);

  // Calculate progress
  const currentStepIndex = STEPS.indexOf(state.currentStep);
  const progress = Math.round((currentStepIndex / (STEPS.length - 1)) * 100);

  return {
    ...state,
    isLoading,
    progress,
    totalSteps: STEPS.length,
    currentStepIndex: currentStepIndex + 1,
    nextStep,
    prevStep,
    goToStep,
    updateStartupInfo,
    completeStep,
    skipOnboarding,
    resetOnboarding,
    canGoBack: currentStepIndex > 0 && state.currentStep !== "complete",
    canGoForward: currentStepIndex < STEPS.length - 1,
  };
}
