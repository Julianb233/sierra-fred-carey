"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  RocketIcon,
  ReloadIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  GearIcon,
  ArrowRightIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

interface PromotionResult {
  experimentName: string;
  status: "promoted" | "skipped" | "failed";
  winningVariant?: string;
  confidence?: number;
  improvement?: number;
  reason: string;
  dryRun: boolean;
}

interface AutoPromotionConfig {
  enabled: boolean;
  dryRun: boolean;
  preset: "aggressive" | "conservative" | "balanced";
  minConfidence: number;
  minImprovement: number;
  minSampleSize: number;
}

interface AutoPromotionPanelProps {
  onPromotionComplete?: () => void;
}

export function AutoPromotionPanel({ onPromotionComplete }: AutoPromotionPanelProps) {
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [config, setConfig] = useState<AutoPromotionConfig | null>(null);
  const [results, setResults] = useState<PromotionResult[]>([]);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local config state for dialog
  const [localPreset, setLocalPreset] = useState<"aggressive" | "conservative" | "balanced">("balanced");
  const [localDryRun, setLocalDryRun] = useState(true);

  // Fetch current config
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/experiments/auto-promote");
      if (!response.ok) throw new Error("Failed to fetch config");
      const data = await response.json();
      if (data.success) {
        setConfig(data.data.config);
        setLocalPreset(data.data.config.preset || "balanced");
        setLocalDryRun(data.data.config.dryRun ?? true);
      }
    } catch (err) {
      console.error("Failed to fetch auto-promotion config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Run promotion scan
  const runScan = async (dryRun: boolean = true) => {
    try {
      setScanning(true);
      setError(null);
      setResults([]);

      const response = await fetch("/api/experiments/auto-promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scan",
          preset: localPreset,
          dryRun,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Scan failed");
      }

      // Transform results
      const promotionResults: PromotionResult[] = [];

      if (data.data.promoted && data.data.promoted.length > 0) {
        data.data.promoted.forEach((p: { experimentName: string; winningVariant?: string; confidence?: number; improvement?: number }) => {
          promotionResults.push({
            experimentName: p.experimentName,
            status: dryRun ? "skipped" : "promoted",
            winningVariant: p.winningVariant,
            confidence: p.confidence,
            improvement: p.improvement,
            reason: dryRun ? "Would promote (dry run)" : "Successfully promoted",
            dryRun,
          });
        });
      }

      if (data.data.skipped && data.data.skipped.length > 0) {
        data.data.skipped.forEach((s: { experimentName: string; reason: string }) => {
          promotionResults.push({
            experimentName: s.experimentName,
            status: "skipped",
            reason: s.reason,
            dryRun,
          });
        });
      }

      if (data.data.failed && data.data.failed.length > 0) {
        data.data.failed.forEach((f: { experimentName: string; error?: string }) => {
          promotionResults.push({
            experimentName: f.experimentName,
            status: "failed",
            reason: f.error || "Unknown error",
            dryRun,
          });
        });
      }

      setResults(promotionResults);

      if (!dryRun && promotionResults.some(r => r.status === "promoted")) {
        onPromotionComplete?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  // Promote specific experiment
  const promoteExperiment = async (experimentName: string) => {
    try {
      setScanning(true);
      setError(null);

      const response = await fetch("/api/experiments/auto-promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "promote",
          experimentName,
          preset: localPreset,
          dryRun: false,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || data.data?.error || "Promotion failed");
      }

      // Update results
      setResults((prev) =>
        prev.map((r) =>
          r.experimentName === experimentName
            ? { ...r, status: "promoted", reason: "Successfully promoted", dryRun: false }
            : r
        )
      );

      onPromotionComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Promotion failed");
    } finally {
      setScanning(false);
    }
  };

  const getStatusBadge = (status: PromotionResult["status"], dryRun: boolean) => {
    if (status === "promoted" && !dryRun) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircledIcon className="h-3 w-3 mr-1" />
          Promoted
        </Badge>
      );
    }
    if (status === "skipped" && dryRun) {
      return (
        <Badge variant="outline" className="border-blue-200 text-blue-700">
          <RocketIcon className="h-3 w-3 mr-1" />
          Ready
        </Badge>
      );
    }
    if (status === "skipped") {
      return (
        <Badge variant="secondary">
          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
          Skipped
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <CrossCircledIcon className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <ReloadIcon className="h-5 w-5 animate-spin" />
            <span>Loading auto-promotion settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RocketIcon className="h-5 w-5 text-[#ff6a1a]" />
              Auto-Promotion
            </CardTitle>
            <CardDescription>
              Automatically promote winning A/B test variants when statistical significance is reached
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <GearIcon className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Auto-Promotion Settings</DialogTitle>
                  <DialogDescription>
                    Configure when experiments should be automatically promoted
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label>Promotion Strategy</Label>
                    <Select value={localPreset} onValueChange={(v: "aggressive" | "conservative" | "balanced") => setLocalPreset(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">
                          <div>
                            <div className="font-medium">Conservative</div>
                            <div className="text-xs text-gray-500">99% confidence, 10% min improvement</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="balanced">
                          <div>
                            <div className="font-medium">Balanced</div>
                            <div className="text-xs text-gray-500">95% confidence, 5% improvement</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="aggressive">
                          <div>
                            <div className="font-medium">Aggressive</div>
                            <div className="text-xs text-gray-500">90% confidence, 3% improvement</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dry Run Mode</Label>
                      <p className="text-sm text-gray-500">
                        Preview promotions without applying changes
                      </p>
                    </div>
                    <Switch
                      checked={localDryRun}
                      onCheckedChange={setLocalDryRun}
                    />
                  </div>

                  {config && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2 text-sm">
                      <div className="font-medium">Current Thresholds</div>
                      <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
                        <div>Min Confidence: {config.minConfidence}%</div>
                        <div>Min Improvement: {config.minImprovement}%</div>
                        <div>Min Sample Size: {config.minSampleSize}</div>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 text-red-600 rounded-lg">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => runScan(true)}
            disabled={scanning}
          >
            {scanning ? (
              <ReloadIcon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <PlayIcon className="h-4 w-4 mr-2" />
            )}
            Preview Promotions
          </Button>
          <Button
            onClick={() => runScan(false)}
            disabled={scanning}
            className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90"
          >
            {scanning ? (
              <ReloadIcon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RocketIcon className="h-4 w-4 mr-2" />
            )}
            Run Auto-Promotion
          </Button>
        </div>

        {/* Current settings */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <Badge variant="outline" className="capitalize">{localPreset}</Badge>
          {localDryRun && (
            <Badge variant="secondary">Dry Run</Badge>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Scan Results
              </h4>
              <div className="text-sm text-gray-500">
                {results.filter(r => r.status === "promoted" || (r.status === "skipped" && r.dryRun && r.winningVariant)).length} ready for promotion
              </div>
            </div>

            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-4 rounded-lg border",
                    result.status === "promoted" ? "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900" :
                    result.status === "failed" ? "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900" :
                    "border-gray-200 dark:border-gray-800"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{result.experimentName}</span>
                        {getStatusBadge(result.status, result.dryRun)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {result.reason}
                      </p>
                      {result.winningVariant && (
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-green-600">
                            Winner: {result.winningVariant}
                          </span>
                          {result.confidence && (
                            <span className="text-gray-500">
                              {result.confidence.toFixed(1)}% confidence
                            </span>
                          )}
                          {result.improvement && (
                            <span className="text-gray-500">
                              +{(result.improvement * 100).toFixed(2)}% improvement
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {result.dryRun && result.winningVariant && result.status === "skipped" && (
                      <Button
                        size="sm"
                        onClick={() => promoteExperiment(result.experimentName)}
                        disabled={scanning}
                        className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90"
                      >
                        <ArrowRightIcon className="h-4 w-4 mr-1" />
                        Promote Now
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {results.length === 0 && !scanning && (
          <div className="text-center py-6 text-gray-500">
            <RocketIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Click &quot;Preview Promotions&quot; to scan for experiments ready to promote</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
