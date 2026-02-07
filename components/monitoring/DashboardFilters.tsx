"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  DownloadIcon,
  Cross2Icon,
  MixIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

export type DateRange = "24h" | "7d" | "30d" | "custom";
export type MetricType = "all" | "latency" | "errors" | "requests" | "conversion";

export interface FilterState {
  dateRange: DateRange;
  selectedExperiments: string[];
  metricType: MetricType;
  customDateStart?: Date;
  customDateEnd?: Date;
}

export interface DashboardFiltersProps {
  experiments?: Array<{ id: string; name: string }>;
  onFilterChange?: (filters: FilterState) => void;
  onExportCSV?: () => void;
  onExportJSON?: () => void;
  loading?: boolean;
}

export function DashboardFilters({
  experiments = [],
  onFilterChange,
  onExportCSV,
  onExportJSON,
  loading = false,
}: DashboardFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: "24h",
    selectedExperiments: [],
    metricType: "all",
  });

  const [experimentSelectorOpen, setExperimentSelectorOpen] = useState(false);

  const handleFilterUpdate = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const toggleExperiment = (experimentId: string) => {
    const newSelected = filters.selectedExperiments.includes(experimentId)
      ? filters.selectedExperiments.filter((id) => id !== experimentId)
      : [...filters.selectedExperiments, experimentId];

    handleFilterUpdate({ selectedExperiments: newSelected });
  };

  const clearExperimentFilters = () => {
    handleFilterUpdate({ selectedExperiments: [] });
  };

  const getDateRangeLabel = (range: DateRange): string => {
    switch (range) {
      case "24h":
        return "Last 24 Hours";
      case "7d":
        return "Last 7 Days";
      case "30d":
        return "Last 30 Days";
      case "custom":
        return "Custom Range";
      default:
        return "Select Range";
    }
  };

  const getMetricTypeLabel = (type: MetricType): string => {
    switch (type) {
      case "all":
        return "All Metrics";
      case "latency":
        return "Latency";
      case "errors":
        return "Error Rate";
      case "requests":
        return "Request Volume";
      case "conversion":
        return "Conversion Rate";
      default:
        return "Select Metric";
    }
  };

  return (
    <Card className="bg-gradient-to-r from-white to-gray-50 dark:from-neutral-950 dark:to-neutral-900 border-neutral-200 dark:border-neutral-800">
      <CardContent className="pt-6">
        <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left side: Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Date Range Selector */}
            <div className="flex-shrink-0">
              <Select
                value={filters.dateRange}
                onValueChange={(value: DateRange) =>
                  handleFilterUpdate({ dateRange: value })
                }
                disabled={loading}
              >
                <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-neutral-950">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    <SelectValue placeholder="Date Range" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">{getDateRangeLabel("24h")}</SelectItem>
                  <SelectItem value="7d">{getDateRangeLabel("7d")}</SelectItem>
                  <SelectItem value="30d">{getDateRangeLabel("30d")}</SelectItem>
                  <SelectItem value="custom">{getDateRangeLabel("custom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Experiment Multi-Selector */}
            <Popover open={experimentSelectorOpen} onOpenChange={setExperimentSelectorOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[220px] justify-between bg-white dark:bg-neutral-950",
                    filters.selectedExperiments.length > 0 && "border-[#ff6a1a]"
                  )}
                  disabled={loading || experiments.length === 0}
                >
                  <div className="flex items-center gap-2">
                    <MixIcon className="h-4 w-4 text-gray-500" />
                    <span className="truncate">
                      {filters.selectedExperiments.length === 0
                        ? "All Experiments"
                        : `${filters.selectedExperiments.length} selected`}
                    </span>
                  </div>
                  {filters.selectedExperiments.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-2 h-5 w-5 p-0 flex items-center justify-center bg-[#ff6a1a] text-white"
                    >
                      {filters.selectedExperiments.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[280px] p-0" align="start">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Select Experiments</h4>
                    {filters.selectedExperiments.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearExperimentFilters}
                        className="h-6 px-2 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-1">
                    {experiments.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                        No experiments available
                      </p>
                    ) : (
                      experiments.map((experiment) => {
                        const isSelected = filters.selectedExperiments.includes(
                          experiment.id
                        );
                        return (
                          <button
                            key={experiment.id}
                            onClick={() => toggleExperiment(experiment.id)}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                              "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                              isSelected && "bg-[#ff6a1a]/10 text-[#ff6a1a]"
                            )}
                          >
                            <div
                              className={cn(
                                "h-4 w-4 rounded border flex items-center justify-center",
                                isSelected
                                  ? "bg-[#ff6a1a] border-[#ff6a1a]"
                                  : "border-gray-300 dark:border-gray-600"
                              )}
                            >
                              {isSelected && (
                                <CheckIcon className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <span className="flex-1 text-left truncate">
                              {experiment.name}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Metric Type Filter */}
            <div className="flex-shrink-0">
              <Select
                value={filters.metricType}
                onValueChange={(value: MetricType) =>
                  handleFilterUpdate({ metricType: value })
                }
                disabled={loading}
              >
                <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-neutral-950">
                  <SelectValue placeholder="Metric Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{getMetricTypeLabel("all")}</SelectItem>
                  <SelectItem value="latency">{getMetricTypeLabel("latency")}</SelectItem>
                  <SelectItem value="errors">{getMetricTypeLabel("errors")}</SelectItem>
                  <SelectItem value="requests">{getMetricTypeLabel("requests")}</SelectItem>
                  <SelectItem value="conversion">
                    {getMetricTypeLabel("conversion")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right side: Export buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCSV}
              disabled={loading}
              className="gap-2 bg-white dark:bg-neutral-950"
            >
              <DownloadIcon className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportJSON}
              disabled={loading}
              className="gap-2 bg-white dark:bg-neutral-950"
            >
              <DownloadIcon className="h-4 w-4" />
              <span className="hidden sm:inline">JSON</span>
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        {filters.selectedExperiments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">
              Active filters:
            </span>
            {filters.selectedExperiments.map((id) => {
              const experiment = experiments.find((exp) => exp.id === id);
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="gap-1 pl-2 pr-1 bg-[#ff6a1a]/10 text-[#ff6a1a] hover:bg-[#ff6a1a]/20"
                >
                  <span className="text-xs">{experiment?.name || id}</span>
                  <button
                    onClick={() => toggleExperiment(id)}
                    className="ml-1 rounded-full hover:bg-[#ff6a1a]/30 p-0.5"
                  >
                    <Cross2Icon className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearExperimentFilters}
              className="h-6 px-2 text-xs text-gray-600 dark:text-gray-400"
            >
              Clear all
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
