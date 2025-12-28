"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChannelConfigCard } from "./ChannelConfigCard";
import { toast } from "sonner";
import { PlusIcon, ReloadIcon } from "@radix-ui/react-icons";

interface NotificationConfig {
  id: string;
  userId: string;
  channel: "slack" | "pagerduty" | "email";
  webhookUrl?: string;
  routingKey?: string;
  emailAddress?: string;
  enabled: boolean;
  alertLevels: ("info" | "warning" | "critical")[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

type AlertLevel = "info" | "warning" | "critical";

const alertLevels: AlertLevel[] = ["info", "warning", "critical"];

export function NotificationChannels() {
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<NotificationConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    channel: "slack" as "slack" | "pagerduty" | "email",
    webhookUrl: "",
    routingKey: "",
    emailAddress: "",
    enabled: true,
    alertLevels: ["info", "warning", "critical"] as AlertLevel[],
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications/settings");
      if (!response.ok) throw new Error("Failed to fetch notification configs");
      const data = await response.json();
      setConfigs(data.configs || []);
    } catch (error) {
      toast.error("Failed to load notification settings", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (configId: string, enabled: boolean) => {
    try {
      const response = await fetch("/api/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId, enabled }),
      });

      if (!response.ok) throw new Error("Failed to update notification config");

      setConfigs((prev) =>
        prev.map((config) =>
          config.id === configId ? { ...config, enabled } : config
        )
      );

      toast.success(`Notifications ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update notification settings", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleEdit = (config: NotificationConfig) => {
    setEditingConfig(config);
    setFormData({
      channel: config.channel,
      webhookUrl: config.webhookUrl || "",
      routingKey: config.routingKey || "",
      emailAddress: config.emailAddress || "",
      enabled: config.enabled,
      alertLevels: config.alertLevels,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (configId: string) => {
    if (!confirm("Are you sure you want to delete this notification channel?")) return;

    try {
      const response = await fetch("/api/notifications/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId }),
      });

      if (!response.ok) throw new Error("Failed to delete notification config");

      setConfigs((prev) => prev.filter((config) => config.id !== configId));
      toast.success("Notification channel deleted");
    } catch (error) {
      toast.error("Failed to delete notification channel", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const endpoint = "/api/notifications/settings";
      const method = editingConfig ? "PATCH" : "POST";
      const body = editingConfig
        ? { configId: editingConfig.id, ...formData }
        : formData;

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to save notification config");

      const data = await response.json();

      if (editingConfig) {
        setConfigs((prev) =>
          prev.map((config) => (config.id === editingConfig.id ? data.config : config))
        );
        toast.success("Notification channel updated");
      } else {
        setConfigs((prev) => [...prev, data.config]);
        toast.success("Notification channel added");
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Failed to save notification channel", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      channel: "slack",
      webhookUrl: "",
      routingKey: "",
      emailAddress: "",
      enabled: true,
      alertLevels: ["info", "warning", "critical"],
    });
    setEditingConfig(null);
  };

  const toggleAlertLevel = (level: AlertLevel) => {
    setFormData((prev) => ({
      ...prev,
      alertLevels: prev.alertLevels.includes(level)
        ? prev.alertLevels.filter((l) => l !== level)
        : [...prev.alertLevels, level],
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>Loading notification settings...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <ReloadIcon className="h-6 w-6 animate-spin text-[#ff6a1a]" />
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
            <CardTitle>Notification Channels</CardTitle>
            <CardDescription>
              Configure where alert notifications are sent
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="orange" size="sm">
                <PlusIcon className="h-4 w-4" />
                Add Channel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingConfig ? "Edit" : "Add"} Notification Channel
                  </DialogTitle>
                  <DialogDescription>
                    Configure a new notification channel to receive alerts
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="channel">Channel Type</Label>
                    <Select
                      value={formData.channel}
                      onValueChange={(value: "slack" | "pagerduty" | "email") =>
                        setFormData({ ...formData, channel: value })
                      }
                      disabled={!!editingConfig}
                    >
                      <SelectTrigger id="channel">
                        <SelectValue placeholder="Select channel type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slack">Slack</SelectItem>
                        <SelectItem value="pagerduty">PagerDuty</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.channel === "slack" && (
                    <div className="space-y-2">
                      <Label htmlFor="webhookUrl">Webhook URL</Label>
                      <Input
                        id="webhookUrl"
                        type="url"
                        placeholder="https://hooks.slack.com/services/..."
                        value={formData.webhookUrl}
                        onChange={(e) =>
                          setFormData({ ...formData, webhookUrl: e.target.value })
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Create a webhook in your Slack workspace settings
                      </p>
                    </div>
                  )}

                  {formData.channel === "pagerduty" && (
                    <div className="space-y-2">
                      <Label htmlFor="routingKey">Integration Key</Label>
                      <Input
                        id="routingKey"
                        type="text"
                        placeholder="Enter PagerDuty integration key"
                        value={formData.routingKey}
                        onChange={(e) =>
                          setFormData({ ...formData, routingKey: e.target.value })
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Find this in your PagerDuty service integration settings
                      </p>
                    </div>
                  )}

                  {formData.channel === "email" && (
                    <div className="space-y-2">
                      <Label htmlFor="emailAddress">Email Address</Label>
                      <Input
                        id="emailAddress"
                        type="email"
                        placeholder="alerts@example.com"
                        value={formData.emailAddress}
                        onChange={(e) =>
                          setFormData({ ...formData, emailAddress: e.target.value })
                        }
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Alert Levels</Label>
                    <div className="flex flex-wrap gap-2">
                      {alertLevels.map((level) => (
                        <Badge
                          key={level}
                          variant={
                            formData.alertLevels.includes(level)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer capitalize hover:bg-[#ff6a1a] hover:text-white transition-colors"
                          onClick={() => toggleAlertLevel(level)}
                        >
                          {level}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select which alert levels trigger notifications
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="enabled">Enable Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Start receiving notifications immediately
                      </p>
                    </div>
                    <Switch
                      id="enabled"
                      checked={formData.enabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, enabled: checked })
                      }
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="orange"
                    disabled={isSaving || formData.alertLevels.length === 0}
                  >
                    {isSaving ? (
                      <>
                        <ReloadIcon className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingConfig ? (
                      "Save Changes"
                    ) : (
                      "Add Channel"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {configs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No notification channels configured
            </p>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(true)}
            >
              <PlusIcon className="h-4 w-4" />
              Add Your First Channel
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {configs.map((config) => (
              <ChannelConfigCard
                key={config.id}
                config={config}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
