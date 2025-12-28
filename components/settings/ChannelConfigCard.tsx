"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { TestNotificationButton } from "./TestNotificationButton";
import {
  EnvelopeClosedIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  Pencil1Icon,
  TrashIcon
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

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

interface ChannelConfigCardProps {
  config: NotificationConfig;
  onToggle: (configId: string, enabled: boolean) => Promise<void>;
  onEdit: (config: NotificationConfig) => void;
  onDelete: (configId: string) => Promise<void>;
}

const channelIcons = {
  slack: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  ),
  pagerduty: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.965 1.18C15.085.164 13.769 0 10.683 0H3.73v18.434h6.426c3.251 0 4.566-.18 6.446-1.188 2.38-1.303 3.912-3.912 3.912-6.617 0-2.713-1.532-5.322-3.549-6.448zm-2.084 10.928c-.828.549-1.644.763-3.532.763H8.431V4.967h2.918c1.888 0 2.696.214 3.532.763 1.045.672 1.62 1.904 1.62 3.188 0 1.284-.575 2.517-1.62 3.19zM3.73 21.077h4.7V24h-4.7z" />
    </svg>
  ),
  email: <EnvelopeClosedIcon className="h-5 w-5" />,
};

const channelNames = {
  slack: "Slack",
  pagerduty: "PagerDuty",
  email: "Email",
};

const alertLevelColors = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function ChannelConfigCard({
  config,
  onToggle,
  onEdit,
  onDelete,
}: ChannelConfigCardProps) {
  const maskWebhookUrl = (url?: string) => {
    if (!url) return "Not configured";
    const parts = url.split("/");
    if (parts.length < 4) return "***";
    return `${parts[0]}//${parts[2]}/***`;
  };

  const getEndpoint = () => {
    if (config.channel === "slack") return maskWebhookUrl(config.webhookUrl);
    if (config.channel === "pagerduty") return config.routingKey ? "***" : "Not configured";
    if (config.channel === "email") return config.emailAddress || "Not configured";
    return "Not configured";
  };

  const lastTestStatus = config.metadata?.lastTestStatus;
  const lastTestTime = config.metadata?.lastTestTime;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-[#ff6a1a]">
              {channelIcons[config.channel]}
            </div>
            <div>
              <CardTitle className="text-base">
                {channelNames[config.channel]}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {getEndpoint()}
              </p>
            </div>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => onToggle(config.id, checked)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Alert Levels</p>
          <div className="flex flex-wrap gap-2">
            {config.alertLevels.map((level) => (
              <Badge
                key={level}
                className={cn(
                  "capitalize",
                  alertLevelColors[level]
                )}
                variant="secondary"
              >
                {level}
              </Badge>
            ))}
          </div>
        </div>

        {lastTestTime && (
          <div className="flex items-center gap-2 text-sm">
            {lastTestStatus === "success" ? (
              <CheckCircledIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <CrossCircledIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <span className="text-muted-foreground">
              Last test:{" "}
              {new Date(lastTestTime).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(config)}
            className="flex-1"
          >
            <Pencil1Icon className="h-3.5 w-3.5" />
            Edit
          </Button>
          <TestNotificationButton
            configId={config.id}
            channel={config.channel}
            disabled={!config.enabled}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(config.id)}
            className="text-destructive hover:bg-destructive/10"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
