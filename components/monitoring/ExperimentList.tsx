"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircledIcon, CrossCircledIcon, UpdateIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

interface Experiment {
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

interface ExperimentListProps {
  experiments: Experiment[];
  loading?: boolean;
}

export function ExperimentList({ experiments, loading = false }: ExperimentListProps) {
  const getStatusBadge = (status: Experiment["status"]) => {
    const variants = {
      active: {
        variant: "default" as const,
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200",
        icon: <UpdateIcon className="h-3 w-3" />,
      },
      completed: {
        variant: "secondary" as const,
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200",
        icon: <CheckCircledIcon className="h-3 w-3" />,
      },
      paused: {
        variant: "outline" as const,
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200",
        icon: <CrossCircledIcon className="h-3 w-3" />,
      },
      draft: {
        variant: "outline" as const,
        className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200",
        icon: null,
      },
    };

    const config = variants[status];
    return (
      <Badge variant={config.variant} className={cn("capitalize flex items-center gap-1", config.className)}>
        {config.icon}
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Experiments</CardTitle>
        <CardDescription>
          A/B tests currently running or recently completed
        </CardDescription>
      </CardHeader>
      <CardContent>
        {experiments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No experiments running
          </div>
        ) : (
          <div className="space-y-4">
            {experiments.map((experiment) => (
              <div
                key={experiment.id}
                className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-[#ff6a1a] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {experiment.name}
                      </h4>
                      {getStatusBadge(experiment.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>Variants: {experiment.variants.join(", ")}</span>
                      <span>•</span>
                      <span>Started: {new Date(experiment.startDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {experiment.significance !== undefined && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#ff6a1a]">
                        {experiment.significance}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Significance
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Traffic Split</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {experiment.traffic}%
                    </span>
                  </div>
                  <Progress value={experiment.traffic} className="h-2" />
                </div>

                {experiment.winner && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <CheckCircledIcon className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        Winner: <span className="font-semibold text-green-600">{experiment.winner}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
