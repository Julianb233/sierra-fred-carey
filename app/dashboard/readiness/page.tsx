"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  BarChart3,
  Target,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { FeatureLock } from "@/components/tier/feature-lock";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";
import { MobileProgress } from "@/components/mobile/mobile-progress";
import { cn } from "@/lib/utils";

// ============================================================================
// Types (mirror API response)
// ============================================================================

type Zone = "red" | "yellow" | "green";

interface CategoryBreakdown {
  name: string;
  score: number;
  benchmark: number;
}

interface InvestorReadinessData {
  score: number | null;
  zone: Zone | null;
  categories: CategoryBreakdown[];
  strengths: string[];
  weaknesses: string[];
  trend: Array<{ score: number; date: string }>;
}

interface PositioningCategory {
  name: string;
  grade: string;
  score: number;
}

interface PositioningReadinessData {
  grade: string | null;
  narrativeTightness: number | null;
  categories: PositioningCategory[];
  gaps: string[];
  nextActions: string[];
}

interface ReadinessResponse {
  investorReadiness: InvestorReadinessData | null;
  positioningReadiness: PositioningReadinessData | null;
  hasIRS: boolean;
  hasPositioning: boolean;
}

// ============================================================================
// Zone Config
// ============================================================================

const ZONE_CONFIG: Record<
  Zone,
  { label: string; color: string; bg: string; barColor: string; description: string }
> = {
  red: {
    label: "Build",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    barColor: "bg-red-500",
    description: "Focus on building and validating before fundraising.",
  },
  yellow: {
    label: "Prove",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    barColor: "bg-amber-500",
    description: "Strengthen proof points to be raise-ready.",
  },
  green: {
    label: "Raise",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
    barColor: "bg-green-500",
    description: "Fundamentals support fundraising. Prepare for investors.",
  },
};

const GRADE_COLORS: Record<string, { color: string; bg: string }> = {
  A: { color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
  B: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  C: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  D: { color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" },
  F: { color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
};

// ============================================================================
// Page Component
// ============================================================================

export default function ReadinessPage() {
  const { tier, isLoading: isTierLoading } = useUserTier();

  if (isTierLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <>
      {/* Mobile view */}
      <div className="md:hidden">
        <MobileProgress />
      </div>

      {/* Desktop view */}
      <div className="hidden md:block">
        <FeatureLock
          requiredTier={UserTier.PRO}
          currentTier={tier}
          featureName="Readiness Dashboard"
          description="See your investor readiness and positioning assessment side by side."
        >
          <ReadinessContent />
        </FeatureLock>
      </div>
    </>
  );
}

function ReadinessContent() {
  const [data, setData] = useState<ReadinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reassessingIRS, setReassessingIRS] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/dashboard/readiness");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load readiness data");
      }
    } catch {
      setError("Failed to load readiness data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Readiness
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Investor readiness and positioning assessment
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Investor Readiness Section */}
        <InvestorReadinessSection
          data={data?.investorReadiness ?? null}
          hasIRS={data?.hasIRS ?? false}
          reassessing={reassessingIRS}
          onReassess={() => {
            // Navigate to existing IRS page for full assessment
            window.location.href = "/dashboard/investor-readiness";
          }}
        />

        {/* Positioning Readiness Section */}
        <PositioningReadinessSection
          data={data?.positioningReadiness ?? null}
          hasPositioning={data?.hasPositioning ?? false}
          onReassess={() => {
            window.location.href = "/dashboard/positioning";
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Investor Readiness Section
// ============================================================================

function InvestorReadinessSection({
  data,
  hasIRS,
  reassessing,
  onReassess,
}: {
  data: InvestorReadinessData | null;
  hasIRS: boolean;
  reassessing: boolean;
  onReassess: () => void;
}) {
  const zone = data?.zone || "red";
  const config = ZONE_CONFIG[zone];

  return (
    <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#ff6a1a]" />
            <CardTitle className="text-lg">Investor Readiness</CardTitle>
          </div>
          {hasIRS && data?.zone && (
            <Badge className={cn("text-xs", config.bg, config.color)}>
              {config.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {hasIRS && data ? (
          <>
            {/* Score display */}
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex items-center justify-center w-20 h-20 rounded-2xl text-3xl font-bold",
                  data.score !== null && data.score >= 70
                    ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                    : data.score !== null && data.score >= 40
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                    : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                )}
              >
                {data.score ?? "--"}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {config.description}
                </p>
              </div>
            </div>

            {/* Zone gauge */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-red-500">Build</span>
                <span className="text-amber-500">Prove</span>
                <span className="text-green-500">Raise</span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-700 ease-out rounded-full",
                    config.barColor
                  )}
                  style={{
                    width: zone === "red" ? "33%" : zone === "yellow" ? "66%" : "100%",
                  }}
                />
              </div>
            </div>

            {/* Category breakdown */}
            {data.categories.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Category Breakdown
                </p>
                {data.categories.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {cat.name}
                      </span>
                      <span className="text-gray-500">
                        {cat.score}/100
                        <span className="text-gray-400 ml-1">
                          (vs {cat.benchmark})
                        </span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          cat.score >= cat.benchmark
                            ? "bg-green-500"
                            : cat.score >= cat.benchmark * 0.8
                            ? "bg-amber-500"
                            : "bg-red-500"
                        )}
                        style={{ width: `${Math.min(cat.score, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Score history sparkline */}
            {data.trend.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Score Trend
                </p>
                <div className="flex items-end gap-1 h-12">
                  {data.trend.map((point, i) => {
                    const maxScore = Math.max(...data.trend.map((p) => p.score));
                    const height = maxScore > 0 ? (point.score / maxScore) * 100 : 0;
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-[#ff6a1a]/70 transition-all duration-300"
                        style={{ height: `${Math.max(height, 10)}%` }}
                        title={`${point.score} - ${new Date(point.date).toLocaleDateString()}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Strengths & Weaknesses */}
            {(data.strengths.length > 0 || data.weaknesses.length > 0) && (
              <div className="space-y-3">
                {data.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Strengths
                    </p>
                    <ul className="space-y-1">
                      {data.strengths.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                          <TrendingUp className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.weaknesses.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Weaknesses
                    </p>
                    <ul className="space-y-1">
                      {data.weaknesses.slice(0, 3).map((w, i) => (
                        <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                          <TrendingDown className="h-3 w-3 mt-0.5 text-red-500 flex-shrink-0" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              No investor readiness score yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Run an assessment to evaluate your fundraising readiness
            </p>
          </div>
        )}

        {/* Reassess button */}
        <Button
          variant="outline"
          onClick={onReassess}
          disabled={reassessing}
          className="w-full border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/5"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", reassessing && "animate-spin")} />
          {hasIRS ? "Reassess" : "Run Assessment"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Positioning Readiness Section
// ============================================================================

function PositioningReadinessSection({
  data,
  hasPositioning,
  onReassess,
}: {
  data: PositioningReadinessData | null;
  hasPositioning: boolean;
  onReassess: () => void;
}) {
  const gradeConfig = data?.grade ? GRADE_COLORS[data.grade] : null;

  return (
    <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-[#ff6a1a]" />
            <CardTitle className="text-lg">Positioning Readiness</CardTitle>
          </div>
          {data?.grade && gradeConfig && (
            <Badge className={cn("text-xs", gradeConfig.bg, gradeConfig.color)}>
              Grade {data.grade}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {hasPositioning && data ? (
          <>
            {/* Grade + Narrative Tightness */}
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex items-center justify-center w-20 h-20 rounded-2xl text-4xl font-bold",
                  gradeConfig?.bg || "bg-gray-100 dark:bg-gray-800",
                  gradeConfig?.color || "text-gray-500"
                )}
              >
                {data.grade || "--"}
              </div>
              <div className="flex-1 space-y-2">
                {data.narrativeTightness !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500">
                        Narrative Tightness
                      </span>
                      <span
                        className={cn(
                          "text-xs font-bold",
                          gradeConfig?.color || "text-gray-500"
                        )}
                      >
                        {data.narrativeTightness}/10
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          data.narrativeTightness >= 7
                            ? "bg-green-500"
                            : data.narrativeTightness >= 5
                            ? "bg-amber-500"
                            : "bg-red-500"
                        )}
                        style={{
                          width: `${data.narrativeTightness * 10}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Category grades */}
            {data.categories.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Dimensions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {data.categories.map((cat) => {
                    const catGrade = GRADE_COLORS[cat.grade];
                    return (
                      <div
                        key={cat.name}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                      >
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {cat.name}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-bold",
                            catGrade?.color || "text-gray-500"
                          )}
                        >
                          {cat.grade}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Key gaps */}
            {data.gaps.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Key Gaps
                </p>
                <div className="space-y-1.5">
                  {data.gaps.slice(0, 4).map((gap, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <span>{gap}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Target className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              No positioning assessment yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Run an assessment to get your positioning grade and identify gaps
            </p>
          </div>
        )}

        {/* Reassess button */}
        <Button
          variant="outline"
          onClick={onReassess}
          className="w-full border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/5"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {hasPositioning ? "Reassess" : "Run Assessment"}
        </Button>
      </CardContent>
    </Card>
  );
}
