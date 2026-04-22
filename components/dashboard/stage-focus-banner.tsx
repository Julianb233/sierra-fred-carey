"use client";

import { Lightbulb, Rocket, TrendingUp, LineChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StageFocusBannerProps {
  stage: string | null;
}

const STAGE_CONFIG: Record<
  string,
  {
    icon: typeof Rocket;
    title: string;
    description: string;
    emphasis: string[];
    color: string;
  }
> = {
  idea: {
    icon: Lightbulb,
    title: "Idea to Fundable Company",
    description:
      "Your path is clear: validate, build, get customers, become fundable.",
    emphasis: [
      "Talk to 10+ potential customers",
      "Ship your MVP",
      "Get first paying users",
      "Build your pitch narrative",
    ],
    color: "from-purple-500/10 to-purple-600/5",
  },
  "pre-seed": {
    icon: Rocket,
    title: "Pre-Seed: Get Investor Ready",
    description:
      "Analyze where you really are, polish your deck, and get warm intros.",
    emphasis: [
      "Reality Lens assessment",
      "Pitch deck review with Mentor",
      "Boardy investor intros",
      "Close fundability gaps",
    ],
    color: "from-blue-500/10 to-blue-600/5",
  },
  seed: {
    icon: TrendingUp,
    title: "Seed: Prove & Scale",
    description:
      "Validate unit economics, nail your market position, and refine your pitch.",
    emphasis: [
      "Unit economics validation",
      "Market sizing & competitive analysis",
      "Investor Readiness Score 80+",
      "Pitch iteration with Mentor",
    ],
    color: "from-green-500/10 to-green-600/5",
  },
  "series-a": {
    icon: LineChart,
    title: "Series A+: Advisory Path",
    description:
      "Demonstrate repeatable growth, optimize economics, and build your leadership team.",
    emphasis: [
      "Month-over-month growth metrics",
      "Unit economics at scale",
      "Series A narrative",
      "Key leadership hires",
    ],
    color: "from-amber-500/10 to-amber-600/5",
  },
};

export function StageFocusBanner({ stage }: StageFocusBannerProps) {
  const config = stage ? STAGE_CONFIG[stage] : null;
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <CardContent
        className={cn(
          "py-4 px-5 bg-gradient-to-r",
          config.color
        )}
      >
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-white/80 dark:bg-gray-900/80 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-[#ff6a1a]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {config.title}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {config.description}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {config.emphasis.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
