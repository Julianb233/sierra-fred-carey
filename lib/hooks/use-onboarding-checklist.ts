/**
 * Onboarding Checklist Hook
 *
 * Phase 30-01: Fetches completion status for onboarding checklist tasks
 * from the dashboard stats API and localStorage for dismissed state.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

const DISMISSED_KEY = "sahara_onboarding_checklist_dismissed";
const DASHBOARD_VISITED_KEY = "sahara_dashboard_visited";

export interface ChecklistTask {
  id: string;
  label: string;
  completed: boolean;
  href?: string;
  cta?: string;
}

interface ChecklistState {
  tasks: ChecklistTask[];
  completedCount: number;
  totalCount: number;
  isDismissed: boolean;
  dismiss: () => void;
}

interface DashboardStatsResponse {
  success: boolean;
  data?: {
    ideasAnalyzed: number;
    pitchDecksReviewed: number;
    checkInsCompleted: number;
    activeAgents: number;
  };
}

export function useOnboardingChecklist(): ChecklistState {
  const [isDismissed, setIsDismissed] = useState(true); // default hidden to prevent flash
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [stats, setStats] = useState<DashboardStatsResponse["data"] | null>(
    null
  );

  // Check dismissed state from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY) === "true";
    setIsDismissed(dismissed);

    // Mark dashboard as visited
    localStorage.setItem(DASHBOARD_VISITED_KEY, "true");
  }, []);

  // Fetch stats from API
  useEffect(() => {
    if (isDismissed) return;

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data: DashboardStatsResponse = await res.json();
          if (data.success && data.data) {
            setStats(data.data);
          }
        }
      } catch {
        // Non-critical: checklist will show unchecked tasks
      } finally {
        setStatsLoaded(true);
      }
    };

    fetchStats();
  }, [isDismissed]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setIsDismissed(true);
  }, []);

  // Build task list from fetched stats
  const dashboardVisited =
    typeof window !== "undefined"
      ? localStorage.getItem(DASHBOARD_VISITED_KEY) === "true"
      : false;

  const tasks: ChecklistTask[] = [
    {
      id: "complete-onboarding",
      label: "Complete your onboarding",
      completed: statsLoaded ? (stats?.checkInsCompleted ?? 0) >= 0 && statsLoaded : false,
      href: "/onboarding",
      cta: "Start",
    },
    {
      id: "first-chat",
      label: "Have your first chat with FRED",
      completed: statsLoaded ? (stats?.ideasAnalyzed ?? 0) > 0 : false,
      href: "/dashboard",
      cta: "Chat now",
    },
    {
      id: "reality-lens",
      label: "Run a Reality Lens analysis",
      completed: false, // Will be checked via strategy_documents
      href: "/dashboard/strategy",
      cta: "Analyze",
    },
    {
      id: "upload-pitch",
      label: "Upload a pitch deck",
      completed: statsLoaded ? (stats?.pitchDecksReviewed ?? 0) > 0 : false,
      href: "/dashboard/documents/new",
      cta: "Upload",
    },
    {
      id: "explore-dashboard",
      label: "Explore your dashboard",
      completed: dashboardVisited,
      href: "/dashboard",
      cta: "Explore",
    },
  ];

  const completedCount = tasks.filter((t) => t.completed).length;

  return {
    tasks,
    completedCount,
    totalCount: tasks.length,
    isDismissed,
    dismiss,
  };
}
