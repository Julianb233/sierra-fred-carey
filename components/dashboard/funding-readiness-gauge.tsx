"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Lock, ArrowRight } from "lucide-react";
import type { FundingReadinessData, DisplayRules } from "@/lib/dashboard/command-center";

// ============================================================================
// Constants
// ============================================================================

const ZONE_CONFIG = {
  red: {
    label: "Build",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    arcColor: "#ef4444",
    description: "Focus on building and validating your core proposition before fundraising.",
  },
  yellow: {
    label: "Prove",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    arcColor: "#f59e0b",
    description: "You have traction signals. Strengthen proof points to be raise-ready.",
  },
  green: {
    label: "Raise",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
    arcColor: "#22c55e",
    description: "Your fundamentals support fundraising. Time to prepare for investor conversations.",
  },
} as const;

// ============================================================================
// Semi-circular Gauge SVG
// ============================================================================

function GaugeArc({ score }: { score: number }) {
  // SVG dimensions
  const size = 200;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = 75;
  const strokeWidth = 14;

  // Arc goes from 180deg (left) to 0deg (right) = a semi-circle
  // Score 0 = far left, 100 = far right
  const startAngle = Math.PI; // 180 degrees
  const endAngle = 0; // 0 degrees
  const totalArc = startAngle - endAngle; // PI radians

  // Background arc segments: Red (0-39), Yellow (40-69), Green (70-100)
  const segments = [
    { start: 0, end: 0.39, color: "#fecaca" },    // Red zone (light)
    { start: 0.39, end: 0.69, color: "#fde68a" },  // Yellow zone (light)
    { start: 0.69, end: 1.0, color: "#bbf7d0" },   // Green zone (light)
  ];

  // Score position on the arc
  const clampedScore = Math.max(0, Math.min(100, score));
  const scoreRatio = clampedScore / 100;
  const needleAngle = startAngle - scoreRatio * totalArc;
  const needleX = cx + radius * Math.cos(needleAngle);
  const needleY = cy - radius * Math.sin(needleAngle);

  // Filled arc color based on zone
  let fillColor: string;
  if (clampedScore >= 70) fillColor = "#22c55e";
  else if (clampedScore >= 40) fillColor = "#f59e0b";
  else fillColor = "#ef4444";

  function arcPath(startFrac: number, endFrac: number): string {
    const a1 = startAngle - startFrac * totalArc;
    const a2 = startAngle - endFrac * totalArc;
    const x1 = cx + radius * Math.cos(a1);
    const y1 = cy - radius * Math.sin(a1);
    const x2 = cx + radius * Math.cos(a2);
    const y2 = cy - radius * Math.sin(a2);
    const largeArc = Math.abs(a1 - a2) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size / 2 + 30}`}
      className="w-full max-w-[220px] mx-auto"
      aria-label={`Funding readiness score: ${score} out of 100`}
      role="img"
    >
      {/* Background zone segments */}
      {segments.map((seg, i) => (
        <path
          key={i}
          d={arcPath(seg.start, seg.end)}
          fill="none"
          stroke={seg.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="dark:opacity-40"
        />
      ))}

      {/* Filled arc up to score */}
      {clampedScore > 0 && (
        <path
          d={arcPath(0, scoreRatio)}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{
            strokeDasharray: `${scoreRatio * Math.PI * radius} ${Math.PI * radius}`,
            transition: "stroke-dasharray 1s ease-out",
          }}
        />
      )}

      {/* Needle dot */}
      <circle
        cx={needleX}
        cy={needleY}
        r={6}
        fill="white"
        stroke={fillColor}
        strokeWidth={3}
        style={{ transition: "cx 1s ease-out, cy 1s ease-out" }}
      />

      {/* Score text in center */}
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        className="fill-gray-900 dark:fill-white"
        fontSize="32"
        fontWeight="bold"
      >
        {clampedScore}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        className="fill-gray-400 dark:fill-gray-500"
        fontSize="12"
      >
        out of 100
      </text>

      {/* Zone labels */}
      <text x={15} y={cy + 25} fontSize="10" className="fill-red-400">Build</text>
      <text x={cx - 10} y={15} fontSize="10" className="fill-amber-400">Prove</text>
      <text x={size - 38} y={cy + 25} fontSize="10" className="fill-green-400">Raise</text>
    </svg>
  );
}

// ============================================================================
// Component
// ============================================================================

interface FundingReadinessGaugeProps {
  readiness: FundingReadinessData;
  displayRules: DisplayRules;
}

export function FundingReadinessGauge({
  readiness,
  displayRules,
}: FundingReadinessGaugeProps) {
  // Don't render at all if display rules say to hide
  if (!displayRules.showFundingGauge) {
    return null;
  }

  const config = ZONE_CONFIG[readiness.zone];

  // Blurred state: intake not completed
  if (displayRules.blurReadiness) {
    return (
      <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-white/60 dark:bg-gray-950/60 backdrop-blur-md z-10 flex items-center justify-center">
          <div className="text-center p-6 max-w-xs">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Lock className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Funding Readiness Locked
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Complete an investor readiness review to unlock your gauge.
            </p>
            <Link href="/dashboard/investor-readiness">
              <Button
                size="sm"
                variant="outline"
                className="text-[#ff6a1a] border-[#ff6a1a]/30 hover:bg-[#ff6a1a]/5"
              >
                Get Assessed
              </Button>
            </Link>
          </div>
        </div>
        {/* Placeholder content behind the blur */}
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Funding Readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center py-4">
            <div className="w-[220px] h-[110px] bg-gray-100 dark:bg-gray-800 rounded-t-full" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasScore = readiness.irsScore !== null && readiness.irsScore !== undefined;

  return (
    <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Funding Readiness</CardTitle>
          <span
            className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${config.bg} ${config.color}`}
          >
            {config.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visual gauge */}
        {hasScore ? (
          <GaugeArc score={readiness.irsScore!} />
        ) : (
          /* Fallback: zone-only bar when no IRS score */
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-red-500">Build</span>
              <span className="text-amber-500">Prove</span>
              <span className="text-green-500">Raise</span>
            </div>
            <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex">
              <div
                className="h-full transition-all duration-700 ease-out"
                style={{
                  width:
                    readiness.zone === "red"
                      ? "33%"
                      : readiness.zone === "yellow"
                      ? "66%"
                      : "100%",
                  backgroundColor: config.arcColor,
                }}
              />
            </div>
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {config.description}
        </p>

        {/* Top blockers */}
        {readiness.topBlockers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {hasScore ? "Next Steps" : "Top Blockers"}
            </p>
            <div className="space-y-1.5">
              {readiness.topBlockers.map((blocker, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>{blocker}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA Button */}
        <Link href="/dashboard/investor-readiness" className="block">
          <Button
            variant="outline"
            className="w-full border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/5 group"
          >
            {hasScore ? "View Full Assessment" : "Run Readiness Review"}
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
