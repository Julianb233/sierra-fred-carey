"use client";

import { useState } from "react";
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
import { RocketIcon, ActivityIcon, BarChart3Icon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UIVariant {
  name: string;
  conversions: number;
  visitors: number;
  conversionRate: number;
  improvement?: number;
  isControl?: boolean;
  isWinner?: boolean;
  latency?: number;
  errorRate?: number;
}

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

interface PromotionEligibility {
  eligible: boolean;
  experimentId: string;
  experimentName: string;
  winningVariant: string | null;
  confidenceLevel: number | null;
  improvement: number | null;
  safetyChecks: Array<{
    passed: boolean;
    checkName: string;
    message: string;
    severity: "info" | "warning" | "critical";
  }>;
  recommendation: "promote" | "wait" | "manual_review" | "not_ready";
  reason: string;
}

export function ExperimentDetailModal({
  experiment,
  open,
  onOpenChange,
  onPromote,
  userId,
}: ExperimentDetailModalProps) {
  const [activeTab, setActiveTab] = useState("variants");
  const [eligibility, setEligibility] = useState<PromotionEligibility | undefined>();
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [promotionLoading, setPromotionLoading] = useState(false);

  // Mock variants data - in real implementation, this would come from the experiment object
  const mockVariants: UIVariant[] = experiment
    ? [
        {
          name: "control",
          conversions: 125,
          visitors: 1250,
          conversionRate: 10.0,
          isControl: true,
          latency: 245,
          errorRate: 0.02,
        },
        {
          name: "variant-a",
          conversions: 158,
          visitors: 1200,
          conversionRate: 13.17,
          improvement: 31.7,
          isWinner: experiment.winner === "variant-a",
          latency: 238,
          errorRate: 0.018,
        },
      ]
    : [];

  const handleCheckEligibility = async () => {
    if (!experiment) return;

    setCheckingEligibility(true);
    try {
      const response = await fetch(
        `/api/ab-testing/promotion/check?experimentName=${experiment.name}${userId ? `&userId=${userId}` : ""}`
      );
      const data = await response.json();

      if (data.success) {
        setEligibility(data.data);
      }
    } catch (error) {
      console.error("Failed to check eligibility:", error);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handlePromote = async () => {
    if (!experiment || !onPromote) return;

    setPromotionLoading(true);
    try {
      await onPromote(experiment.name);
      // Close modal after successful promotion
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to promote:", error);
    } finally {
      setPromotionLoading(false);
    }
  };

  if (!experiment) return null;

  const isActive = experiment.status === "active";
  const hasWinner = !!experiment.winner;
  const canPromote = isActive && hasWinner && (experiment.significance || 0) >= 95;

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
                {hasWinner && (
                  <Badge className="bg-[#ff6a1a] text-white">
                    Winner: {experiment.winner}
                  </Badge>
                )}
                {experiment.significance && (
                  <Badge variant="outline">
                    {experiment.significance.toFixed(1)}% Confidence
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

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
