"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VariantComparison } from "@/components/monitoring/VariantComparison";
import { PromotionStatus } from "@/components/monitoring/PromotionStatus";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RocketIcon, ActivityIcon, BarChart3Icon, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useExperimentDetail } from "@/lib/hooks/useExperimentDetail";
import { usePromotionWorkflow } from "@/lib/hooks/usePromotionWorkflow";
import { transformVariant } from "@/types/monitoring";
import { toast } from "sonner";
import type { UIVariant } from "@/types/monitoring";

interface UIExperiment {
  id: string;
  name: string;
  status: "active" | "completed" | "paused" | "draft";
  variants: string[];
  traffic: number;
  startDate: string;
  endDate?: string;
  winner?: string;
  significance?: number;
}

interface ExperimentDetailModalProps {
  experiment: UIExperiment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPromote?: (experimentName: string) => void;
  userId?: string;
}

export function ExperimentDetailModal({
  experiment,
  open,
  onOpenChange,
  onPromote,
  userId,
}: ExperimentDetailModalProps) {
  const [activeTab, setActiveTab] = useState("variants");

  // Use hooks for data fetching
  const {
    experiment: experimentDetail,
    loading: detailLoading,
    error: detailError,
    refetch: refetchDetail,
  } = useExperimentDetail(experiment?.name || "", open && !!experiment);

  const {
    eligibility,
    loading: eligibilityLoading,
    promoting,
    error: promotionError,
    checkEligibility,
    promoteWinner,
  } = usePromotionWorkflow();

  // Transform variant data from API response
  const variants: UIVariant[] = experimentDetail?.variants.map((variant) => {
    const controlVariant = experimentDetail.variants.find(
      (v) => v.variantName.toLowerCase() === "control"
    );
    const controlRate = controlVariant?.conversionRate;
    const transformed = transformVariant(variant, controlRate);

    // Mark winner if exists
    if (experimentDetail.winningVariant === variant.variantName) {
      transformed.isWinner = true;
    }

    return transformed;
  }) || [];

  // Handle eligibility check
  const handleCheckEligibility = async () => {
    if (!experiment) return;

    try {
      const result = await checkEligibility(experiment.name);
      if (!result) {
        toast.error("Failed to check promotion eligibility");
      }
    } catch (error) {
      toast.error("Error checking eligibility");
      console.error("Failed to check eligibility:", error);
    }
  };

  // Handle promotion
  const handlePromote = async () => {
    if (!experiment) return;

    try {
      const result = await promoteWinner(experiment.name, {
        backupBeforePromotion: true,
        rolloutPercentage: 100,
      });

      if (result?.success) {
        toast.success(`Successfully promoted ${result.promotedVariant}`, {
          description: result.message,
        });

        // Call parent callback if provided
        if (onPromote) {
          await onPromote(experiment.name);
        }

        // Refetch data and close modal
        await refetchDetail();
        onOpenChange(false);
      } else {
        toast.error("Promotion failed", {
          description: result?.message || "Unknown error occurred",
        });
      }
    } catch (error) {
      toast.error("Error during promotion");
      console.error("Failed to promote:", error);
    }
  };

  // Show error toast on promotion or detail errors
  useEffect(() => {
    if (detailError) {
      toast.error("Failed to load experiment details", {
        description: detailError.message,
      });
    }
  }, [detailError]);

  useEffect(() => {
    if (promotionError) {
      toast.error("Promotion error", {
        description: promotionError.message,
      });
    }
  }, [promotionError]);

  if (!experiment) return null;

  const isActive = experimentDetail?.isActive ?? experiment.status === "active";
  const hasWinner = !!experimentDetail?.winningVariant;
  const significance = experimentDetail?.confidenceLevel ?? experiment.significance ?? 0;
  const canPromote = isActive && hasWinner && significance >= 95;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{experiment.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className={cn(
                    isActive && "bg-green-500 text-white hover:bg-green-600"
                  )}
                >
                  {experiment.status.charAt(0).toUpperCase() + experiment.status.slice(1)}
                </Badge>
                {hasWinner && experimentDetail?.winningVariant && (
                  <Badge className="bg-[#ff6a1a] text-white">
                    Winner: {experimentDetail.winningVariant}
                  </Badge>
                )}
                {significance > 0 && (
                  <Badge variant="outline">
                    {significance.toFixed(1)}% Confidence
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Loading State */}
        {detailLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Loading experiment details...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {detailError && !detailLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3 text-center max-w-md">
              <div className="p-3 bg-red-100 dark:bg-red-950 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Failed to load experiment details
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {detailError.message}
                </p>
              </div>
              <Button
                onClick={() => refetchDetail()}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Content - Only show when data is loaded */}
        {!detailLoading && !detailError && experimentDetail && (

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="variants" className="flex items-center gap-2">
              <BarChart3Icon className="h-4 w-4" />
              Variants
            </TabsTrigger>
            <TabsTrigger value="promotion" className="flex items-center gap-2">
              <RocketIcon className="h-4 w-4" />
              Promotion
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <ActivityIcon className="h-4 w-4" />
              Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="variants" className="mt-6">
            <VariantComparison
              experimentName={experiment.name}
              variants={mockVariants}
              significance={experiment.significance}
            />
          </TabsContent>

          <TabsContent value="promotion" className="mt-6">
            <PromotionStatus
              experimentId={experiment.id}
              experimentName={experiment.name}
              isActive={isActive}
              eligibility={eligibility}
              onPromote={handlePromote}
              onCheckEligibility={handleCheckEligibility}
              loading={checkingEligibility || promotionLoading}
            />
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Latency and error rate comparison across variants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {mockVariants.map((variant) => (
                    <div
                      key={variant.name}
                      className="p-4 border rounded-lg bg-white dark:bg-gray-950"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                          {variant.name}
                        </h4>
                        {variant.isControl && (
                          <Badge variant="outline" className="text-xs">
                            Control
                          </Badge>
                        )}
                        {variant.isWinner && (
                          <Badge className="bg-green-500 text-white">
                            Winner
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Avg Latency
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {variant.latency?.toFixed(0)}ms
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Response time
                          </div>
                        </div>

                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Error Rate
                          </div>
                          <div
                            className={cn(
                              "text-2xl font-bold",
                              (variant.errorRate || 0) < 0.02
                                ? "text-green-600"
                                : (variant.errorRate || 0) < 0.05
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            )}
                          >
                            {((variant.errorRate || 0) * 100).toFixed(2)}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Failed requests
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Performance Summary:</strong> Lower latency and error rates
                    indicate better system reliability. Monitor these metrics alongside
                    conversion rates for a complete picture.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <div className="flex items-center justify-between w-full gap-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-initial"
            >
              Close
            </Button>
            {canPromote && onPromote && (
              <Button
                onClick={handlePromote}
                disabled={promotionLoading}
                className="flex-1 sm:flex-initial bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white"
              >
                <RocketIcon className="mr-2 h-4 w-4" />
                {promotionLoading ? "Promoting..." : "Promote Winner"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
