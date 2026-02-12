"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import type { FounderSnapshotData } from "@/lib/dashboard/command-center";

// ============================================================================
// Constants
// ============================================================================

const STAGE_LABELS: Record<string, string> = {
  idea: "Idea Stage",
  mvp: "MVP",
  "pre-seed": "Pre-Seed",
  seed: "Seed",
  "series-a": "Series A",
  growth: "Growth",
};

const STAGE_COLORS: Record<string, string> = {
  idea: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  mvp: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "pre-seed": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  seed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "series-a": "bg-[#ff6a1a]/10 text-[#ff6a1a] dark:bg-[#ff6a1a]/20 dark:text-[#ff6a1a]",
  growth: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

// ============================================================================
// Component
// ============================================================================

interface FounderSnapshotCardProps {
  snapshot: FounderSnapshotData;
}

function AskFredLink({ label }: { label: string }) {
  return (
    <Link
      href="/chat"
      className="inline-flex items-center gap-1 text-sm text-[#ff6a1a] hover:text-[#ea580c] transition-colors font-medium"
    >
      <MessageSquare className="h-3.5 w-3.5" />
      Ask FRED about {label}
    </Link>
  );
}

function SnapshotField({
  label,
  value,
  askFredLabel,
}: {
  label: string;
  value: string | null;
  askFredLabel: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </p>
      {value ? (
        <p className="text-sm text-gray-900 dark:text-white">{value}</p>
      ) : (
        <AskFredLink label={askFredLabel} />
      )}
    </div>
  );
}

export function FounderSnapshotCard({ snapshot }: FounderSnapshotCardProps) {
  const stageLabel = snapshot.stage
    ? STAGE_LABELS[snapshot.stage] || snapshot.stage
    : null;
  const stageColor = snapshot.stage
    ? STAGE_COLORS[snapshot.stage] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    : "";

  // Format runway display
  let runwayDisplay: string | null = null;
  if (snapshot.runway) {
    const parts: string[] = [];
    if (snapshot.runway.time) parts.push(snapshot.runway.time);
    if (snapshot.runway.money) parts.push(snapshot.runway.money);
    if (parts.length > 0) {
      runwayDisplay = parts.join(" / ");
    }
  }

  return (
    <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Founder Snapshot</CardTitle>
          {stageLabel && (
            <Badge className={stageColor}>{stageLabel}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SnapshotField
            label="Stage"
            value={stageLabel}
            askFredLabel="your stage"
          />
          <SnapshotField
            label="Primary Constraint"
            value={snapshot.primaryConstraint}
            askFredLabel="your constraint"
          />
          <SnapshotField
            label="90-Day Goal"
            value={snapshot.ninetyDayGoal}
            askFredLabel="your 90-day goal"
          />
          <SnapshotField
            label="Runway"
            value={runwayDisplay}
            askFredLabel="your runway"
          />
        </div>
      </CardContent>
    </Card>
  );
}
