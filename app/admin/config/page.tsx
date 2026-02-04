"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

interface AIConfig {
  analyzer: string;
  model: string;
  temperature: number;
  maxTokens: number;
  dimensionWeights: Record<string, number> | null;
  scoreThresholds: Record<string, number> | null;
  customSettings: Record<string, any>;
}

export default function ConfigPage() {
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAnalyzer, setSavingAnalyzer] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    try {
      const response = await fetch("/api/admin/config");
      if (response.ok) {
        const data = await response.json();
        setConfigs(data);
      }
    } catch (error) {
      console.error("Error fetching configs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig(analyzer: string, updates: Partial<AIConfig>) {
    setSavingAnalyzer(analyzer);
    try {
      const response = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analyzer, updates }),
      });

      if (response.ok) {
        fetchConfigs();
      }
    } catch (error) {
      console.error("Error saving config:", error);
    } finally {
      setSavingAnalyzer(null);
    }
  }

  function handleConfigChange(
    analyzer: string,
    field: keyof AIConfig,
    value: any
  ) {
    setConfigs((prev) =>
      prev.map((config) =>
        config.analyzer === analyzer ? { ...config, [field]: value } : config
      )
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Analyzer Configuration
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure AI models and parameters for each analyzer
        </p>
      </div>

      <div className="space-y-6">
        {configs.map((config) => (
          <Card key={config.analyzer}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="capitalize">
                    {config.analyzer.replace(/_/g, " ")}
                  </CardTitle>
                  <CardDescription>
                    Model: {config.model}
                  </CardDescription>
                </div>
                <Button
                  variant="orange"
                  size="sm"
                  onClick={() => handleSaveConfig(config.analyzer, config)}
                  disabled={savingAnalyzer === config.analyzer}
                >
                  {savingAnalyzer === config.analyzer ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`${config.analyzer}-model`}>Model</Label>
                  <Input
                    id={`${config.analyzer}-model`}
                    value={config.model}
                    onChange={(e) =>
                      handleConfigChange(config.analyzer, "model", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${config.analyzer}-temperature`}>
                    Temperature
                  </Label>
                  <Input
                    id={`${config.analyzer}-temperature`}
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={config.temperature}
                    onChange={(e) =>
                      handleConfigChange(
                        config.analyzer,
                        "temperature",
                        parseFloat(e.target.value)
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${config.analyzer}-maxTokens`}>
                    Max Tokens
                  </Label>
                  <Input
                    id={`${config.analyzer}-maxTokens`}
                    type="number"
                    step="100"
                    min="100"
                    value={config.maxTokens}
                    onChange={(e) =>
                      handleConfigChange(
                        config.analyzer,
                        "maxTokens",
                        parseInt(e.target.value, 10)
                      )
                    }
                  />
                </div>
              </div>

              {config.dimensionWeights && (
                <div className="space-y-2">
                  <Label htmlFor={`${config.analyzer}-weights`}>
                    Dimension Weights (JSON)
                  </Label>
                  <Textarea
                    id={`${config.analyzer}-weights`}
                    value={JSON.stringify(config.dimensionWeights, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        handleConfigChange(
                          config.analyzer,
                          "dimensionWeights",
                          parsed
                        );
                      } catch (err) {
                        // Invalid JSON, ignore
                      }
                    }}
                    className="font-mono text-sm"
                    rows={4}
                  />
                </div>
              )}

              {config.scoreThresholds && (
                <div className="space-y-2">
                  <Label htmlFor={`${config.analyzer}-thresholds`}>
                    Score Thresholds (JSON)
                  </Label>
                  <Textarea
                    id={`${config.analyzer}-thresholds`}
                    value={JSON.stringify(config.scoreThresholds, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        handleConfigChange(
                          config.analyzer,
                          "scoreThresholds",
                          parsed
                        );
                      } catch (err) {
                        // Invalid JSON, ignore
                      }
                    }}
                    className="font-mono text-sm"
                    rows={4}
                  />
                </div>
              )}

              {Object.keys(config.customSettings).length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor={`${config.analyzer}-custom`}>
                    Custom Settings (JSON)
                  </Label>
                  <Textarea
                    id={`${config.analyzer}-custom`}
                    value={JSON.stringify(config.customSettings, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        handleConfigChange(
                          config.analyzer,
                          "customSettings",
                          parsed
                        );
                      } catch (err) {
                        // Invalid JSON, ignore
                      }
                    }}
                    className="font-mono text-sm"
                    rows={4}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {configs.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No configurations found.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
