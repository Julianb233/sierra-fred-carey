"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  BellIcon,
  ReloadIcon,
  CheckCircledIcon,
  ExclamationTriangleIcon,
  RocketIcon,
} from "@radix-ui/react-icons";

interface AlertThresholds {
  conversionRateDrop: number;
  latencySpike: number;
  errorRate: number;
  minSampleSize: number;
}

interface NotificationPreferences {
  slack: {
    enabled: boolean;
    configId?: string;
    alertLevels: string[];
  };
  pagerduty: {
    enabled: boolean;
    configId?: string;
    alertLevels: string[];
  };
  email: {
    enabled: boolean;
    configId?: string;
    alertLevels: string[];
  };
}

interface NotificationConfig {
  id: string;
  channel: "slack" | "email" | "pagerduty";
  enabled: boolean;
  alertLevels: string[];
}

export function AlertConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Alert thresholds state
  const [thresholds, setThresholds] = useState<AlertThresholds>({
    conversionRateDrop: 10,
    latencySpike: 500,
    errorRate: 5,
    minSampleSize: 100,
  });

  // Notification preferences state
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    slack: {
      enabled: false,
      alertLevels: ["critical", "warning"],
    },
    pagerduty: {
      enabled: false,
      alertLevels: ["critical"],
    },
    email: {
      enabled: false,
      alertLevels: ["critical", "warning", "info"],
    },
  });

  // Store original values for reset
  const [originalThresholds, setOriginalThresholds] = useState<AlertThresholds>(thresholds);
  const [originalNotifications, setOriginalNotifications] = useState<NotificationPreferences>(notifications);

  // Fetch current notification configs
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications/settings");

      if (!response.ok) {
        throw new Error("Failed to fetch notification settings");
      }

      const data = await response.json();

      if (data.success) {
        const configs: NotificationConfig[] = data.data.configs;

        // Map configs to notification preferences
        const newNotifications: NotificationPreferences = {
          slack: {
            enabled: false,
            alertLevels: ["critical", "warning"],
          },
          pagerduty: {
            enabled: false,
            alertLevels: ["critical"],
          },
          email: {
            enabled: false,
            alertLevels: ["critical", "warning", "info"],
          },
        };

        configs.forEach((config) => {
          if (config.channel === "slack" || config.channel === "pagerduty" || config.channel === "email") {
            newNotifications[config.channel] = {
              enabled: config.enabled,
              configId: config.id,
              alertLevels: config.alertLevels || newNotifications[config.channel].alertLevels,
            };
          }
        });

        setNotifications(newNotifications);
        setOriginalNotifications(newNotifications);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to load alert settings");
    } finally {
      setLoading(false);
    }
  };

  const handleThresholdChange = (key: keyof AlertThresholds, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setThresholds((prev) => ({ ...prev, [key]: numValue }));
    }
  };

  const handleNotificationToggle = (channel: keyof NotificationPreferences) => {
    setNotifications((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        enabled: !prev[channel].enabled,
      },
    }));
  };

  const handleAlertLevelChange = (channel: keyof NotificationPreferences, levels: string[]) => {
    setNotifications((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        alertLevels: levels,
      },
    }));
  };

  const handleTestAlert = async (channel: keyof NotificationPreferences) => {
    const config = notifications[channel];
    if (!config.enabled || !config.configId) {
      toast.error(`${channel.charAt(0).toUpperCase() + channel.slice(1)} notifications are not configured`);
      return;
    }

    try {
      setTesting(channel);
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId: config.configId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Test notification sent via ${channel}`, {
          description: "Check your notification channel for the test message",
        });
      } else {
        throw new Error(data.error || "Test failed");
      }
    } catch (error) {
      console.error("Test notification failed:", error);
      toast.error("Failed to send test notification", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setTesting(null);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update each notification config
      const updatePromises = Object.entries(notifications).map(async ([channel, config]) => {
        if (!config.configId) return;

        const response = await fetch("/api/notifications/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            configId: config.configId,
            enabled: config.enabled,
            alertLevels: config.alertLevels,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update ${channel} settings`);
        }

        return response.json();
      });

      await Promise.all(updatePromises);

      // Update original values
      setOriginalThresholds(thresholds);
      setOriginalNotifications(notifications);

      toast.success("Alert settings saved successfully", {
        description: "Your notification preferences have been updated",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save alert settings", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setThresholds(originalThresholds);
    setNotifications(originalNotifications);
    toast.info("Settings reset to last saved state");
  };

  const hasChanges =
    JSON.stringify(thresholds) !== JSON.stringify(originalThresholds) ||
    JSON.stringify(notifications) !== JSON.stringify(originalNotifications);

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
              <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-12 bg-gray-200 dark:bg-gray-800 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Thresholds */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
            <CardTitle>Alert Thresholds</CardTitle>
          </div>
          <CardDescription>
            Configure when alerts should be triggered for your experiments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="conversionRateDrop">Conversion Rate Drop (%)</Label>
              <Input
                id="conversionRateDrop"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={thresholds.conversionRateDrop}
                onChange={(e) => handleThresholdChange("conversionRateDrop", e.target.value)}
                placeholder="10"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Alert when conversion rate drops by this percentage
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="latencySpike">Latency Spike Threshold (ms)</Label>
              <Input
                id="latencySpike"
                type="number"
                min="0"
                step="1"
                value={thresholds.latencySpike}
                onChange={(e) => handleThresholdChange("latencySpike", e.target.value)}
                placeholder="500"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Alert when response time exceeds this value
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="errorRate">Error Rate Threshold (%)</Label>
              <Input
                id="errorRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={thresholds.errorRate}
                onChange={(e) => handleThresholdChange("errorRate", e.target.value)}
                placeholder="5"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Alert when error rate exceeds this percentage
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minSampleSize">Minimum Sample Size</Label>
              <Input
                id="minSampleSize"
                type="number"
                min="1"
                step="1"
                value={thresholds.minSampleSize}
                onChange={(e) => handleThresholdChange("minSampleSize", e.target.value)}
                placeholder="100"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Minimum requests before triggering statistical alerts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BellIcon className="h-5 w-5 text-blue-600" />
            <CardTitle>Notification Channels</CardTitle>
          </div>
          <CardDescription>
            Configure how and where you receive alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Slack */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="slack-enabled" className="text-base font-semibold">
                    Slack Notifications
                  </Label>
                  {!notifications.slack.configId && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-500">
                      Not configured
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Send alerts to your Slack workspace
                </p>
              </div>
              <Switch
                id="slack-enabled"
                checked={notifications.slack.enabled}
                onCheckedChange={() => handleNotificationToggle("slack")}
                disabled={!notifications.slack.configId}
              />
            </div>

            {notifications.slack.enabled && notifications.slack.configId && (
              <div className="ml-6 space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-800">
                <div className="space-y-2">
                  <Label>Alert Severity Levels</Label>
                  <div className="flex gap-2 flex-wrap">
                    {["critical", "warning", "info"].map((level) => (
                      <label
                        key={level}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={notifications.slack.alertLevels.includes(level)}
                          onChange={(e) => {
                            const newLevels = e.target.checked
                              ? [...notifications.slack.alertLevels, level]
                              : notifications.slack.alertLevels.filter((l) => l !== level);
                            handleAlertLevelChange("slack", newLevels);
                          }}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestAlert("slack")}
                  disabled={testing === "slack"}
                >
                  {testing === "slack" ? (
                    <>
                      <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RocketIcon className="mr-2 h-4 w-4" />
                      Send Test Alert
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* PagerDuty */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="pagerduty-enabled" className="text-base font-semibold">
                    PagerDuty Alerts
                  </Label>
                  {!notifications.pagerduty.configId && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-500">
                      Not configured
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create incidents in PagerDuty for critical issues
                </p>
              </div>
              <Switch
                id="pagerduty-enabled"
                checked={notifications.pagerduty.enabled}
                onCheckedChange={() => handleNotificationToggle("pagerduty")}
                disabled={!notifications.pagerduty.configId}
              />
            </div>

            {notifications.pagerduty.enabled && notifications.pagerduty.configId && (
              <div className="ml-6 space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-800">
                <div className="space-y-2">
                  <Label>Alert Severity Levels</Label>
                  <div className="flex gap-2 flex-wrap">
                    {["critical", "warning", "info"].map((level) => (
                      <label
                        key={level}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={notifications.pagerduty.alertLevels.includes(level)}
                          onChange={(e) => {
                            const newLevels = e.target.checked
                              ? [...notifications.pagerduty.alertLevels, level]
                              : notifications.pagerduty.alertLevels.filter((l) => l !== level);
                            handleAlertLevelChange("pagerduty", newLevels);
                          }}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestAlert("pagerduty")}
                  disabled={testing === "pagerduty"}
                >
                  {testing === "pagerduty" ? (
                    <>
                      <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RocketIcon className="mr-2 h-4 w-4" />
                      Send Test Alert
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Email */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="email-enabled" className="text-base font-semibold">
                    Email Notifications
                  </Label>
                  {!notifications.email.configId && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-500">
                      Not configured
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receive alerts via email
                </p>
              </div>
              <Switch
                id="email-enabled"
                checked={notifications.email.enabled}
                onCheckedChange={() => handleNotificationToggle("email")}
                disabled={!notifications.email.configId}
              />
            </div>

            {notifications.email.enabled && notifications.email.configId && (
              <div className="ml-6 space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-800">
                <div className="space-y-2">
                  <Label>Alert Severity Levels</Label>
                  <div className="flex gap-2 flex-wrap">
                    {["critical", "warning", "info"].map((level) => (
                      <label
                        key={level}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={notifications.email.alertLevels.includes(level)}
                          onChange={(e) => {
                            const newLevels = e.target.checked
                              ? [...notifications.email.alertLevels, level]
                              : notifications.email.alertLevels.filter((l) => l !== level);
                            handleAlertLevelChange("email", newLevels);
                          }}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestAlert("email")}
                  disabled={testing === "email"}
                >
                  {testing === "email" ? (
                    <>
                      <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RocketIcon className="mr-2 h-4 w-4" />
                      Send Test Alert
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges || saving}
        >
          Reset Changes
        </Button>

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
          >
            {saving ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircledIcon className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
