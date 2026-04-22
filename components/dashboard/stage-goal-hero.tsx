"use client";

import {
  Lightbulb,
  Rocket,
  TrendingUp,
  LineChart,
  ArrowRight,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// Stage Definitions
// ============================================================================

interface StageMilestone {
  label: string;
  description: string;
}

interface StageHeroConfig {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  gradient: string;
  iconBg: string;
  milestones: StageMilestone[];
  ctaLabel: string;
  ctaHref: string;
  emphasizedFeatures: string[];
}

const STAGE_HERO_CONFIG: Record<string, StageHeroConfig> = {
  idea: {
    icon: Lightbulb,
    title: "Idea to Fundable Company",
    subtitle:
      "You're at the beginning of something great. Follow this path to turn your idea into a venture investors want to fund.",
    gradient: "from-amber-500/10 to-orange-500/10",
    iconBg: "bg-amber-500",
    milestones: [
      {
        label: "Validate your idea",
        description: "Talk to real customers and confirm the problem exists",
      },
      {
        label: "Build your MVP",
        description: "Ship the simplest version that solves the core problem",
      },
      {
        label: "Get first customers",
        description: "Prove demand with 5-10 real paying users",
      },
      {
        label: "Become fundable",
        description: "Build the narrative: problem, solution, traction, team",
      },
    ],
    ctaLabel: "Chat with FRED to get started",
    ctaHref: "/chat",
    emphasizedFeatures: ["chat", "reality-lens", "goal-roadmap"],
  },
  "pre-seed": {
    icon: Rocket,
    title: "Analyze & Prepare to Raise",
    subtitle:
      "You've got something real. Now let's sharpen your readiness, refine your pitch, and connect you with the right investors.",
    gradient: "from-blue-500/10 to-indigo-500/10",
    iconBg: "bg-blue-500",
    milestones: [
      {
        label: "Analyze your readiness",
        description: "Get an honest assessment of where you stand today",
      },
      {
        label: "Refine your pitch deck",
        description: "Upload your deck for detailed FRED review and feedback",
      },
      {
        label: "Close fundability gaps",
        description: "Identify and address what investors will question",
      },
      {
        label: "Get warm investor intros",
        description: "Connect with aligned investors through Boardy network",
      },
    ],
    ctaLabel: "Start your readiness analysis",
    ctaHref: "/chat",
    emphasizedFeatures: ["pitch-deck", "readiness", "boardy", "goal-roadmap"],
  },
  seed: {
    icon: TrendingUp,
    title: "Prove & Scale to Seed",
    subtitle:
      "You're in the game. Time to validate your economics, nail the pitch, and close your round.",
    gradient: "from-green-500/10 to-emerald-500/10",
    iconBg: "bg-green-500",
    milestones: [
      {
        label: "Validate unit economics",
        description: "Know your CAC, LTV, and path to profitability",
      },
      {
        label: "Complete market analysis",
        description: "Defensible TAM/SAM/SOM with competitive positioning",
      },
      {
        label: "Achieve investor readiness",
        description: "Score 80+ on Investor Readiness with clean data room",
      },
      {
        label: "Refine your pitch",
        description: "Iterate until every slide earns its place",
      },
    ],
    ctaLabel: "Check your investor readiness",
    ctaHref: "/chat",
    emphasizedFeatures: [
      "readiness",
      "pitch-deck",
      "investor-targeting",
      "goal-roadmap",
    ],
  },
  "series-a": {
    icon: LineChart,
    title: "Advisory & Growth Optimization",
    subtitle:
      "You're past the early stage. FRED operates in advisory mode — helping you optimize growth, strengthen your team, and build the Series A narrative.",
    gradient: "from-purple-500/10 to-violet-500/10",
    iconBg: "bg-purple-500",
    milestones: [
      {
        label: "Demonstrate repeatable growth",
        description: "Consistent MoM growth in key metrics that scales",
      },
      {
        label: "Optimize unit economics",
        description: "Drive down CAC, increase LTV, improve margins at scale",
      },
      {
        label: "Build the Series A narrative",
        description: "Why now, why you, and exactly how the capital gets used",
      },
      {
        label: "Strengthen leadership team",
        description: "Plan key hires that show you can execute at the next level",
      },
    ],
    ctaLabel: "Get strategic advice from FRED",
    ctaHref: "/chat",
    emphasizedFeatures: ["strategy", "coaching", "goal-roadmap"],
  },
};

// ============================================================================
// Component
// ============================================================================

interface StageGoalHeroProps {
  stage: string | null;
  /** Number of goals the user has already completed */
  completedGoals?: number;
  /** Total goals for this stage */
  totalGoals?: number;
}

export function StageGoalHero({
  stage,
  completedGoals = 0,
  totalGoals = 0,
}: StageGoalHeroProps) {
  const config = stage ? STAGE_HERO_CONFIG[stage] : null;

  // Don't render if no stage is set
  if (!config) return null;

  const Icon = config.icon;
  const hasProgress = totalGoals > 0;
  const progressPercent = hasProgress
    ? Math.round((completedGoals / totalGoals) * 100)
    : 0;

  return (
    <Card
      className={cn(
        "overflow-hidden border-0 bg-gradient-to-br",
        config.gradient
      )}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div
            className={cn(
              "flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
              config.iconBg
            )}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {config.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
              {config.subtitle}
            </p>
          </div>
        </div>

        {/* Progress bar (when goals exist) */}
        {hasProgress && (
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-gray-600 dark:text-gray-400">
                Progress
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {completedGoals}/{totalGoals} goals
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/60 dark:bg-gray-800/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#ff6a1a] transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Milestones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {config.milestones.map((milestone, index) => (
            <div
              key={index}
              className="flex items-start gap-2.5 bg-white/50 dark:bg-gray-900/50 rounded-xl p-3"
            >
              <div className="flex-shrink-0 mt-0.5">
                {hasProgress && index < completedGoals ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                    {index + 1}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                  {milestone.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {milestone.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button
          asChild
          className="w-full sm:w-auto bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/20"
        >
          <a href={config.ctaHref}>
            {config.ctaLabel}
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Returns the list of feature keys that should be emphasized for a given stage.
 * Used by the dashboard to conditionally highlight or dim widgets.
 */
export function getEmphasizedFeatures(stage: string | null): string[] {
  if (!stage) return [];
  return STAGE_HERO_CONFIG[stage]?.emphasizedFeatures ?? [];
}
