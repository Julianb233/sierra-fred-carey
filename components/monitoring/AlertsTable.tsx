"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExclamationTriangleIcon, InfoCircledIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: "error" | "warning" | "info" | "success";
  message: string;
  timestamp: string;
  source?: string;
  resolved?: boolean;
}

interface AlertsTableProps {
  alerts: Alert[];
  loading?: boolean;
  maxItems?: number;
}

export function AlertsTable({ alerts, loading = false, maxItems = 10 }: AlertsTableProps) {
  const getAlertConfig = (type: Alert["type"]) => {
    const configs = {
      error: {
        icon: <ExclamationTriangleIcon className="h-4 w-4" />,
        className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200",
        textColor: "text-red-600 dark:text-red-400",
      },
      warning: {
        icon: <ExclamationTriangleIcon className="h-4 w-4" />,
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200",
        textColor: "text-yellow-600 dark:text-yellow-400",
      },
      info: {
        icon: <InfoCircledIcon className="h-4 w-4" />,
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200",
        textColor: "text-blue-600 dark:text-blue-400",
      },
      success: {
        icon: <CheckCircledIcon className="h-4 w-4" />,
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200",
        textColor: "text-green-600 dark:text-green-400",
      },
    };
    return configs[type];
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayAlerts = alerts.slice(0, maxItems);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Alerts</CardTitle>
        <CardDescription>
          System notifications and monitoring alerts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {displayAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <CheckCircledIcon className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>No alerts - all systems operational</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-32">Source</TableHead>
                <TableHead className="w-32 text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayAlerts.map((alert) => {
                const config = getAlertConfig(alert.type);
                return (
                  <TableRow
                    key={alert.id}
                    className={cn(
                      alert.resolved && "opacity-50"
                    )}
                  >
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("capitalize flex items-center gap-1 w-fit", config.className)}
                      >
                        {config.icon}
                        {alert.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          alert.resolved && "line-through",
                          "text-gray-900 dark:text-white"
                        )}>
                          {alert.message}
                        </span>
                        {alert.resolved && (
                          <Badge variant="outline" className="text-xs bg-gray-100 dark:bg-gray-800">
                            Resolved
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                      {alert.source || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400 text-right">
                      {formatTimestamp(alert.timestamp)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
