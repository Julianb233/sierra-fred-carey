"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserTier } from "@/lib/constants";

const FEATURES_EXPLORED_KEY = "sahara_features_explored";

export interface GetStartedStep {
  id: string;
  number: number | "*";
  label: string;
  description: string;
  completed: boolean;
  href: string;
  cta: string;
  isOptional?: boolean;
}

interface GetStartedState {
  steps: GetStartedStep[];
  completedCount: number;
  coreStepCount: number;
  allCoreComplete: boolean;
  isLoading: boolean;
}

export function useGetStartedSteps(tier: UserTier): GetStartedState {
  const [isLoading, setIsLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [hasConversation, setHasConversation] = useState(false);
  const [featuresExplored, setFeaturesExplored] = useState(false);

  useEffect(() => {
    // Check localStorage for features explored
    setFeaturesExplored(
      localStorage.getItem(FEATURES_EXPLORED_KEY) === "true"
    );

    async function fetchData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsLoading(false);
          return;
        }

        // Fetch profile and stats in parallel
        const [profileRes, statsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("stage, challenges")
            .eq("id", user.id)
            .single(),
          fetch("/api/dashboard/stats"),
        ]);

        // Check profile completion: stage + challenges populated
        if (profileRes.data) {
          const { stage, challenges } = profileRes.data;
          setProfileComplete(
            Boolean(stage) && Boolean(challenges)
          );
        }

        // Check conversation count from stats API
        if (statsRes.ok) {
          const json = await statsRes.json();
          if (json.success && json.data) {
            setHasConversation((json.data.ideasAnalyzed ?? 0) > 0);
          }
        }
      } catch (e) {
        console.error("Failed to fetch get-started data:", e);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const coreSteps: GetStartedStep[] = [
    {
      id: "tell-fred",
      number: 1,
      label: "Tell Fred about your startup",
      description:
        "Fred gives better advice when he knows your stage and biggest challenge.",
      completed: profileComplete,
      href: "/onboarding",
      cta: "Get Started",
    },
    {
      id: "first-conversation",
      number: 2,
      label: "Have your first conversation with Fred",
      description:
        "Chat with Fred about any startup decision — strategy, fundraising, product, growth.",
      completed: hasConversation,
      href: "/chat",
      cta: "Chat with Fred",
    },
    {
      id: "explore-features",
      number: 3,
      label: "Explore what Fred can do",
      description:
        "Discover Reality Lens, decision tracking, and AI insights — all included free.",
      completed: featuresExplored,
      href: "/dashboard/reality-lens",
      cta: "See Features",
    },
  ];

  const optionalStep: GetStartedStep = {
    id: "unlock-voice",
    number: "*",
    label: "Unlock voice calls & more",
    description:
      "Pro members can call Fred by voice. Studio adds weekly SMS check-ins.",
    completed: tier >= UserTier.PRO,
    href: "/pricing",
    cta: tier >= UserTier.PRO ? "Unlocked" : "See Plans",
    isOptional: true,
  };

  const steps = [...coreSteps, optionalStep];
  const completedCount = coreSteps.filter((s) => s.completed).length;
  const coreStepCount = coreSteps.length;
  const allCoreComplete = completedCount === coreStepCount;

  return {
    steps,
    completedCount,
    coreStepCount,
    allCoreComplete,
    isLoading,
  };
}
