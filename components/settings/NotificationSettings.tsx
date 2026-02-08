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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
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
  CrossCircledIcon,
  ReloadIcon,
  PlusIcon,
  TrashIcon,
  GearIcon,
  ExclamationTriangleIcon,
  BellIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { usePushSubscription } from "@/lib/hooks/use-push-subscription";
import type { PushCategory, PushCategoryConfig } from "@/lib/push/preferences";

interface NotificationConfig {
  id: string;
  channel: "slack" | "email" | "pagerduty";
  webhookUrl?: string;
  emailAddress?: string;
  routingKey?: string;
  enabled: boolean;
  alertLevels: string[];
  createdAt: string;
  updatedAt: string;
}

interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
}

const ALERT_LEVEL_OPTIONS = [
  { value: "info", label: "Info", description: "General updates and status changes" },
  { value: "warning", label: "Warning", description: "Performance issues or anomalies" },
  { value: "critical", label: "Critical", description: "Urgent issues requiring attention" },
];

const CHANNEL_CONFIGS = {
  slack: {
    label: "Slack",
    description: "Send alerts to Slack via webhook",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
      </svg>
    ),
  },
  pagerduty: {
    label: "PagerDuty",
    description: "Create incidents in PagerDuty",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.73 0H8.27L0 8.27v7.46L8.27 24h7.46L24 15.73V8.27L15.73 0zm-3.02 17.87c-3.18 0-5.75-2.58-5.75-5.75 0-3.18 2.58-5.75 5.75-5.75 3.18 0 5.75 2.58 5.75 5.75 0 3.18-2.58 5.75-5.75 5.75z" />
      </svg>
    ),
  },
  email: {
    label: "Email",
    description: "Send alerts via email",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M22 6L12 13 2 6" />
      </svg>
    ),
  },
};

export function NotificationSettings() {
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, sent: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Push notification state
  const {
    isSupported: pushSupported,
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    subscribe: pushSubscribe,
    unsubscribe: pushUnsubscribe,
    loading: pushLoading,
    error: pushError,
  } = usePushSubscription();

  // Push category preferences
  const [pushPreferences, setPushPreferences] = useState<Record<PushCategory, PushCategoryConfig> | null>(null);
  const [prefLoading, setPrefLoading] = useState(false);

  // Fetch push category preferences when push is subscribed
  useEffect(() => {
    if (!pushSubscribed) {
      setPushPreferences(null);
      return;
    }

    const fetchPreferences = async () => {
      try {
        setPrefLoading(true);
        const response = await fetch("/api/push/preferences");
        if (!response.ok) return;
        const data = await response.json();
        if (data.success) {
          setPushPreferences(data.data);
        }
      } catch {
        // Silently fail — preferences will show defaults
      } finally {
        setPrefLoading(false);
      }
    };

    fetchPreferences();
  }, [pushSubscribed]);

  // Toggle a push category preference
  const handleCategoryToggle = async (category: PushCategory, enabled: boolean) => {
    // Optimistic update
    if (pushPreferences) {
      setPushPreferences({
        ...pushPreferences,
        [category]: { ...pushPreferences[category], enabled },
      });
    }

    try {
      const response = await fetch("/api/push/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, enabled }),
      });

      if (!response.ok) {
        throw new Error("Failed to update preference");
      }

      const data = await response.json();
      if (data.success) {
        setPushPreferences(data.data);
        toast.success(`${enabled ? "Enabled" : "Disabled"} ${pushPreferences?.[category]?.label ?? category}`);
      }
    } catch {
      // Revert optimistic update
      if (pushPreferences) {
        setPushPreferences({
          ...pushPreferences,
          [category]: { ...pushPreferences[category], enabled: !enabled },
        });
      }
      toast.error("Failed to update notification preference");
    }
  };

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newChannel, setNewChannel] = useState<"slack" | "pagerduty" | "email">("slack");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newRoutingKey, setNewRoutingKey] = useState("");
  const [newEmailAddress, setNewEmailAddress] = useState("");
  const [newAlertLevels, setNewAlertLevels] = useState<string[]>(["warning", "critical"]);

  // Fetch notification configs
  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/notifications/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      if (data.success) {
        setConfigs(data.data.configs || []);
        setStats(data.data.stats || { total: 0, sent: 0, failed: 0 });
      }
    } catch (fetchErr) {
      setError(fetchErr instanceof Error ? fetchErr.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // Handle push notification toggle
  const handlePushToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        await pushSubscribe();
        toast.success("Push notifications enabled");
      } else {
        await pushUnsubscribe();
        toast.success("Push notifications disabled");
      }
    } catch {
      // Error is surfaced via pushError from the hook
    }
  };

  // Add new config
  const handleAddConfig = async () => {
    try {
      setSaving(true);
      setError(null);

      const body: {
        channel: string;
        alertLevels: string[];
        enabled: boolean;
        testOnCreate: boolean;
        webhookUrl?: string;
        routingKey?: string;
        emailAddress?: string;
      } = {
        channel: newChannel,
        alertLevels: newAlertLevels,
        enabled: true,
        testOnCreate: true,
      };

      if (newChannel === "slack") {
        body.webhookUrl = newWebhookUrl;
      } else if (newChannel === "pagerduty") {
        body.routingKey = newRoutingKey;
      } else if (newChannel === "email") {
        body.emailAddress = newEmailAddress;
      }

      const response = await fetch("/api/notifications/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create configuration");
      }

      // Reset form and refresh
      setShowAddDialog(false);
      setNewWebhookUrl("");
      setNewRoutingKey("");
      setNewEmailAddress("");
      setNewAlertLevels(["warning", "critical"]);
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add configuration");
    } finally {
      setSaving(false);
    }
  };

  // Toggle config enabled state
  const handleToggle = async (configId: string, enabled: boolean) => {
    try {
      const response = await fetch("/api/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId, enabled }),
      });

      if (!response.ok) throw new Error("Failed to update");

      setConfigs((prev) =>
        prev.map((c) => (c.id === configId ? { ...c, enabled } : c))
      );
    } catch {
      setError("Failed to update configuration");
    }
  };

  // Delete config
  const handleDelete = async (configId: string) => {
    if (!confirm("Are you sure you want to delete this notification configuration?")) {
      return;
    }

    try {
      const response = await fetch(`/api/notifications/settings?configId=${configId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      setConfigs((prev) => prev.filter((c) => c.id !== configId));
    } catch {
      setError("Failed to delete configuration");
    }
  };

  // Test notification
  const handleTest = async (configId: string) => {
    try {
      setTesting(configId);
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Test failed");
      }

      toast.success("Test notification sent successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2">
            <ReloadIcon className="h-5 w-5 animate-spin" />
            <span>Loading notification settings...</span>
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
            <CardTitle>Alert Notifications</CardTitle>
            <CardDescription>
              Configure push, Slack, PagerDuty, or email notifications for alerts
            </CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Channel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Notification Channel</DialogTitle>
                <DialogDescription>
                  Configure a new alert notification channel
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Channel Selection */}
                <div className="space-y-2">
                  <Label>Channel Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["slack", "pagerduty", "email"] as const).map((channel) => (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => setNewChannel(channel)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                          newChannel === channel
                            ? "border-[#ff6a1a] bg-[#ff6a1a]/5"
                            : "border-gray-200 dark:border-gray-800 hover:border-gray-300"
                        )}
                      >
                        <div className={cn(newChannel === channel ? "text-[#ff6a1a]" : "text-gray-500")}>
                          {CHANNEL_CONFIGS[channel].icon}
                        </div>
                        <span className="text-xs font-medium">
                          {CHANNEL_CONFIGS[channel].label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Channel-specific inputs */}
                {newChannel === "slack" && (
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Slack Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Create a webhook in your Slack workspace settings
                    </p>
                  </div>
                )}

                {newChannel === "pagerduty" && (
                  <div className="space-y-2">
                    <Label htmlFor="routing-key">PagerDuty Routing Key</Label>
                    <Input
                      id="routing-key"
                      placeholder="Your PagerDuty integration key"
                      value={newRoutingKey}
                      onChange={(e) => setNewRoutingKey(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Found in your PagerDuty service integration settings
                    </p>
                  </div>
                )}

                {newChannel === "email" && (
                  <div className="space-y-2">
                    <Label htmlFor="email-address">Email Address</Label>
                    <Input
                      id="email-address"
                      type="email"
                      placeholder="alerts@yourcompany.com"
                      value={newEmailAddress}
                      onChange={(e) => setNewEmailAddress(e.target.value)}
                    />
                  </div>
                )}

                {/* Alert Levels */}
                <div className="space-y-3">
                  <Label>Alert Levels</Label>
                  {ALERT_LEVEL_OPTIONS.map((level) => (
                    <div
                      key={level.value}
                      className="flex items-center space-x-3"
                    >
                      <Checkbox
                        id={`level-${level.value}`}
                        checked={newAlertLevels.includes(level.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewAlertLevels([...newAlertLevels, level.value]);
                          } else {
                            setNewAlertLevels(newAlertLevels.filter((l) => l !== level.value));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={`level-${level.value}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {level.label}
                        </label>
                        <p className="text-xs text-gray-500">{level.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddConfig}
                  disabled={saving}
                  className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90"
                >
                  {saving ? (
                    <>
                      <ReloadIcon className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Configuration"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error display */}
        {(error || pushError) && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 text-red-600 rounded-lg">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span className="text-sm">{error || pushError}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <CrossCircledIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Browser Push Notifications Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BellIcon className="h-5 w-5 text-[#ff6a1a]" />
            <h3 className="font-semibold text-base">Browser Push Notifications</h3>
          </div>

          {!pushSupported ? (
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <ExclamationTriangleIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                Push notifications are not supported in this browser.
              </span>
            </div>
          ) : pushPermission === "denied" ? (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700 dark:text-yellow-400">
                Notifications are blocked. Please update your browser settings.
              </span>
            </div>
          ) : (
            <div
              className={cn(
                "flex items-center justify-between p-4 rounded-lg border",
                pushSubscribed
                  ? "border-gray-200 dark:border-gray-800"
                  : "border-gray-100 dark:border-gray-900"
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    pushSubscribed
                      ? "bg-[#ff6a1a]/10 text-[#ff6a1a]"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                  )}
                >
                  <BellIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Browser Push</span>
                    {pushSubscribed ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Receive real-time alerts directly in your browser
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {pushLoading && (
                  <ReloadIcon className="h-4 w-4 animate-spin text-gray-400" />
                )}
                <Switch
                  checked={pushSubscribed}
                  onCheckedChange={handlePushToggle}
                  disabled={pushLoading}
                />
              </div>
            </div>
          )}

          {/* Push Notification Categories — shown when push is active */}
          {pushSubscribed && pushPreferences && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Push Notification Categories
              </h4>
              {prefLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <ReloadIcon className="h-4 w-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">Loading preferences...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {(Object.entries(pushPreferences) as [PushCategory, PushCategoryConfig][]).map(
                    ([category, config]) => (
                      <div
                        key={category}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-900"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{config.label}</span>
                          <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
                        </div>
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={(enabled) => handleCategoryToggle(category, enabled)}
                        />
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total}
            </div>
            <div className="text-xs text-gray-500">Total (7 days)</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats.sent}
            </div>
            <div className="text-xs text-gray-500">Sent</div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {stats.failed}
            </div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>
        </div>

        <Separator />

        {/* Configured Channels */}
        {configs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <GearIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No notification channels configured yet</p>
            <p className="text-sm">Add a Slack or PagerDuty integration to receive alerts</p>
          </div>
        ) : (
          <div className="space-y-4">
            {configs.map((config) => (
              <div
                key={config.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border",
                  config.enabled
                    ? "border-gray-200 dark:border-gray-800"
                    : "border-gray-100 dark:border-gray-900 opacity-60"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-2 rounded-lg",
                    config.enabled
                      ? "bg-[#ff6a1a]/10 text-[#ff6a1a]"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                  )}>
                    {CHANNEL_CONFIGS[config.channel].icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {CHANNEL_CONFIGS[config.channel].label}
                      </span>
                      {config.enabled ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {config.alertLevels.map((level) => (
                        <Badge key={level} variant="outline" className="text-xs capitalize">
                          {level}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTest(config.id)}
                    disabled={testing === config.id || !config.enabled}
                  >
                    {testing === config.id ? (
                      <ReloadIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      "Test"
                    )}
                  </Button>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(enabled) => handleToggle(config.id, enabled)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(config.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
