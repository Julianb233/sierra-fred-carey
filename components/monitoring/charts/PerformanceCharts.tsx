"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversionRateChart } from "./ConversionRateChart";
import { LatencyChart } from "./LatencyChart";
import { TrafficPieChart } from "./TrafficPieChart";
import { ErrorRateChart } from "./ErrorRateChart";
import type { TimeRange } from "@/lib/types/charts";
import {
  ActivityLogIcon,
  TimerIcon,
  PieChartIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";

interface PerformanceChartsProps {
  className?: string;
}

export function PerformanceCharts({ className }: PerformanceChartsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");

  const timeRangeOptions = [
    { value: "24h", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
  ];

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">
              Performance Analytics
            </CardTitle>
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="conversion" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="conversion" className="gap-2">
                <ActivityLogIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Conversions</span>
              </TabsTrigger>
              <TabsTrigger value="latency" className="gap-2">
                <TimerIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Latency</span>
              </TabsTrigger>
              <TabsTrigger value="traffic" className="gap-2">
                <PieChartIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Traffic</span>
              </TabsTrigger>
              <TabsTrigger value="errors" className="gap-2">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Errors</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conversion" className="space-y-4">
              <ConversionRateChart timeRange={timeRange} />
            </TabsContent>

            <TabsContent value="latency" className="space-y-4">
              <LatencyChart timeRange={timeRange} />
            </TabsContent>

            <TabsContent value="traffic" className="space-y-4">
              <TrafficPieChart />
            </TabsContent>

            <TabsContent value="errors" className="space-y-4">
              <ErrorRateChart timeRange={timeRange} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
