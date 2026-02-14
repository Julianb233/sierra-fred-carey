"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

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
  revenueRange?: string;
  teamSize?: number;
  fundingHistory?: string;
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

/** Sync onboarding completion + startup info to the profiles table.
 *  Reads the existing profile first and only fills in empty fields
 *  to avoid overwriting data set by /api/onboard or other flows. */
async function syncCompletionToDb(state: OnboardingState) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Read existing profile to avoid overwriting populated fields
  const { data: existing } = await supabase
    .from("profiles")
    .select("name, stage, industry, challenges, revenue_range, team_size, funding_history")
    .eq("id", user.id)
    .single();

  // Build update object — only set fields that are currently empty in the DB
  const updateData: Record<string, any> = {
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };

  // Add startup info fields only if the existing profile field is empty
  if (state.startupInfo.name && !existing?.name) updateData.name = state.startupInfo.name;
  if (state.startupInfo.stage && !existing?.stage) updateData.stage = state.startupInfo.stage;
  if (state.startupInfo.industry && !existing?.industry) updateData.industry = state.startupInfo.industry;

  // Store mainChallenge in challenges JSONB array — merge, don't replace
  if (state.startupInfo.mainChallenge) {
    const existingChallenges = Array.isArray(existing?.challenges) ? existing.challenges : [];
    if (existingChallenges.length === 0) {
      updateData.challenges = [state.startupInfo.mainChallenge];
    }
  }

  // Enrichment fields — only fill empty
  if (state.startupInfo.revenueRange && !existing?.revenue_range) updateData.revenue_range = state.startupInfo.revenueRange;
  if (state.startupInfo.teamSize !== undefined && !existing?.team_size) updateData.team_size = state.startupInfo.teamSize;
  if (state.startupInfo.fundingHistory && !existing?.funding_history) updateData.funding_history = state.startupInfo.fundingHistory;

  // Track enrichment metadata
  if (updateData.industry || updateData.revenue_range || updateData.team_size || updateData.funding_history) {
    updateData.enriched_at = new Date().toISOString();
    updateData.enrichment_source = "onboarding";
  }

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id);

  if (error) {
    console.error("[useOnboarding] Failed to sync to database:", error);
  } else {
    console.log("[useOnboarding] Successfully synced onboarding data to database");
  }

  // Populate Fred's semantic memory with onboarding facts
  await populateFredMemory(state.startupInfo);
}

/** Store onboarding facts in Fred's semantic memory via API */
async function populateFredMemory(info: StartupInfo) {
  const facts: Array<{ category: string; key: string; value: Record<string, unknown> }> = [];

  if (info.name) {
    facts.push({ category: "startup_facts", key: "company_name", value: { name: info.name } });
  }
  if (info.stage) {
    facts.push({ category: "startup_facts", key: "funding_stage", value: { stage: info.stage } });
  }
  if (info.industry) {
    facts.push({ category: "startup_facts", key: "industry", value: { industry: info.industry } });
  }
  if (info.description) {
    facts.push({ category: "startup_facts", key: "description", value: { description: info.description } });
  }
  if (info.mainChallenge) {
    facts.push({ category: "challenges", key: "primary_challenge", value: { description: info.mainChallenge } });
  }
  if (info.goals && info.goals.length > 0) {
    facts.push({ category: "goals", key: "onboarding_goals", value: { goals: info.goals } });
  }
  if (info.revenueRange) {
    facts.push({ category: "metrics", key: "revenue_range", value: { range: info.revenueRange } });
  }
  if (info.teamSize !== undefined) {
    facts.push({ category: "team_info", key: "team_size", value: { size: info.teamSize } });
  }
  if (info.fundingHistory) {
    facts.push({ category: "startup_facts", key: "funding_history", value: { history: info.fundingHistory } });
  }

  // Fire all fact storage requests in parallel
  const results = await Promise.allSettled(
    facts.map((fact) =>
      fetch("/api/fred/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "fact",
          category: fact.category,
          key: fact.key,
          value: fact.value,
          confidence: 1.0,
          source: "onboarding",
        }),
      })
    )
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.error(`[useOnboarding] Failed to store ${failed.length}/${facts.length} facts in Fred memory`);
  } else if (facts.length > 0) {
    console.log(`[useOnboarding] Stored ${facts.length} facts in Fred's semantic memory`);
  }
}

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

    // Sync completion to database
    if (newState.isComplete) {
      syncCompletionToDb(newState).catch((err) =>
        console.error("[useOnboarding] DB sync error:", err)
      );
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
