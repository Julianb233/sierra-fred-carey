"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircledIcon, ArrowUpIcon, ArrowDownIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

interface Variant {
  name: string;
  conversions: number;
  visitors: number;
  conversionRate: number;
  improvement?: number;
  isControl?: boolean;
  isWinner?: boolean;
}

interface VariantComparisonProps {
  experimentName: string;
  variants: Variant[];
  significance?: number;
  loading?: boolean;
}

export function VariantComparison({
  experimentName,
  variants,
  significance,
  loading = false,
}: VariantComparisonProps) {
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxConversionRate = Math.max(...variants.map((v) => v.conversionRate));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{experimentName}</CardTitle>
            <CardDescription>A/B test variant performance comparison</CardDescription>
          </div>
          {significance !== undefined && (
            <div className="text-right">
              <div className={cn(
                "text-2xl font-bold",
                significance >= 95 ? "text-green-600" : significance >= 80 ? "text-yellow-600" : "text-gray-600"
              )}>
                {significance}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Statistical Significance
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {variants.map((variant, index) => (
            <div
              key={index}
              className={cn(
                "p-4 rounded-lg border-2 transition-all",
                variant.isWinner
                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                  : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                    {variant.name}
                  </h4>
                  {variant.isControl && (
                    <Badge variant="outline" className="text-xs">
                      Control
                    </Badge>
                  )}
                  {variant.isWinner && (
                    <Badge className="bg-green-500 text-white flex items-center gap-1">
                      <CheckCircledIcon className="h-3 w-3" />
                      Winner
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-[#ff6a1a]">
                    {variant.conversionRate.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Conversion Rate
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Conversions
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {variant.conversions.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Visitors
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {variant.visitors.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Performance</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {((variant.conversionRate / maxConversionRate) * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={(variant.conversionRate / maxConversionRate) * 100}
                  className={cn(
                    "h-3",
                    variant.isWinner && "[&>div]:bg-green-500"
                  )}
                />
              </div>

              {variant.improvement !== undefined && variant.improvement !== 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    {variant.improvement > 0 ? (
                      <>
                        <ArrowUpIcon className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          +{variant.improvement.toFixed(2)}% improvement
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowDownIcon className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-600">
                          {variant.improvement.toFixed(2)}% decrease
                        </span>
                      </>
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      vs control
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {significance !== undefined && significance < 95 && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> This experiment has not reached statistical significance yet (95% required).
              Continue running the test for more reliable results.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
