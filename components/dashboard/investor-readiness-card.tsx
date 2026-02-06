"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, TrendingDown, Minus, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreGauge } from "@/components/irs/score-gauge";
import { cn } from "@/lib/utils";
import type { IRSResult, IRSCategory } from "@/lib/fred/irs/types";
import { CATEGORY_LABELS } from "@/lib/fred/irs/types";

interface InvestorReadinessCardProps {
  className?: string;
  isPro?: boolean;
}

export function InvestorReadinessCard({
  className,
  isPro = false,
}: InvestorReadinessCardProps) {
  const [result, setResult] = useState<IRSResult | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPro) {
      setLoading(false);
      return;
    }

    async function fetchLatest() {
      try {
        const response = await fetch("/api/fred/investor-readiness?latest=true");
        const data = await response.json();

        if (response.ok && data.result) {
          setResult(data.result);

          // Fetch previous for comparison
          const historyResponse = await fetch("/api/fred/investor-readiness?limit=2");
          const historyData = await historyResponse.json();
          if (historyData.history?.length > 1) {
            setPreviousScore(historyData.history[1].overall);
          }
        }
      } catch (err) {
        setError("Failed to load score");
      } finally {
        setLoading(false);
      }
    }

    fetchLatest();
  }, [isPro]);

  // Locked state for non-Pro users
  if (!isPro) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
          <Lock className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-white font-medium">Pro Feature</p>
          <Link href="/pricing">
            <Button size="sm" className="mt-2 bg-[#ff6a1a] hover:bg-[#ea580c]">
              Upgrade
            </Button>
          </Link>
        </div>
        <CardHeader>
          <CardTitle className="text-lg">Investor Readiness Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 opacity-50">
            <ScoreGauge score={65} size="md" animated={false} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Investor Readiness Score</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error || !result) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Investor Readiness Score</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-gray-500 mb-4">
            {error || "No assessment yet"}
          </p>
          <Link href="/dashboard/investor-readiness">
            <Button className="bg-[#ff6a1a] hover:bg-[#ea580c]">
              Get Your Score
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Calculate change from previous
  const change = previousScore ? result.overall - previousScore : null;
  const TrendIcon = change && change > 0 ? TrendingUp : change && change < 0 ? TrendingDown : Minus;

  // Get top categories
  const categoryOrder: IRSCategory[] = ['team', 'market', 'product', 'traction', 'financials', 'pitch'];
  const sortedCategories = categoryOrder.sort(
    (a, b) => result.categories[b].score - result.categories[a].score
  );

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Investor Readiness Score</CardTitle>
        {change !== null && (
          <div
            className={cn(
              "flex items-center gap-1 text-sm",
              change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-gray-500"
            )}
          >
            <TrendIcon className="h-4 w-4" />
            <span>{change > 0 ? "+" : ""}{change}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Score gauge */}
          <ScoreGauge score={result.overall} size="md" />

          {/* Quick stats */}
          <div className="flex-1 space-y-2">
            {/* Top 2 categories */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase">Strongest</p>
              <div className="flex flex-wrap gap-2">
                {sortedCategories.slice(0, 2).map((cat) => (
                  <span
                    key={cat}
                    className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  >
                    {CATEGORY_LABELS[cat]}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom category */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase">Focus Area</p>
              <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                {CATEGORY_LABELS[sortedCategories[sortedCategories.length - 1]]}
              </span>
            </div>
          </div>
        </div>

        {/* Link to full page */}
        <Link href="/dashboard/investor-readiness" className="block mt-4">
          <Button variant="outline" className="w-full group">
            View Full Assessment
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
