"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  MagnifyingGlassIcon,
  Cross2Icon,
  MixIcon,
  CheckCircledIcon,
  UpdateIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

export type ExperimentStatus = "all" | "active" | "completed" | "paused" | "draft";
export type SortOption = "name" | "date" | "significance" | "traffic";

export interface ExperimentFilterState {
  search: string;
  status: ExperimentStatus;
  sortBy: SortOption;
  minSignificance?: number;
}

interface ExperimentFiltersProps {
  filters: ExperimentFilterState;
  onChange: (filters: ExperimentFilterState) => void;
  totalCount: number;
  filteredCount: number;
  className?: string;
}

const statusOptions: { value: ExperimentStatus; label: string; icon?: React.ReactNode }[] = [
  { value: "all", label: "All Experiments", icon: <MixIcon className="h-3 w-3" /> },
  { value: "active", label: "Active", icon: <UpdateIcon className="h-3 w-3" /> },
  { value: "completed", label: "Completed", icon: <CheckCircledIcon className="h-3 w-3" /> },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "name", label: "Name (A-Z)" },
  { value: "date", label: "Date (Newest)" },
  { value: "significance", label: "Significance (Highest)" },
  { value: "traffic", label: "Traffic (Highest)" },
];

export function ExperimentFilters({
  filters,
  onChange,
  totalCount,
  filteredCount,
  className,
}: ExperimentFiltersProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  const updateFilter = (key: keyof ExperimentFilterState, value: any) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onChange({
      search: "",
      status: "all",
      sortBy: "date",
    });
  };

  const hasActiveFilters = filters.search || filters.status !== "all" || filters.minSignificance;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search experiments..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={cn(
              "pl-9 pr-9 transition-all",
              searchFocused && "ring-2 ring-[#ff6a1a]/20"
            )}
          />
          {filters.search && (
            <button
              onClick={() => updateFilter("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Cross2Icon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.icon}
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort By */}
        <Select value={filters.sortBy} onValueChange={(v) => updateFilter("sortBy", v as SortOption)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters & Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>
            Showing {filteredCount} of {totalCount} experiments
          </span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 px-2 text-xs"
            >
              <Cross2Icon className="mr-1 h-3 w-3" />
              Clear filters
            </Button>
          )}
        </div>

        {filters.status !== "all" && (
          <Badge variant="secondary" className="gap-1">
            {statusOptions.find((o) => o.value === filters.status)?.icon}
            {statusOptions.find((o) => o.value === filters.status)?.label}
          </Badge>
        )}
      </div>
    </div>
  );
}
