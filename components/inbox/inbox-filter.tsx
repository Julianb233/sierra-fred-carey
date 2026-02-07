"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InboxFilters, MessageSource, MessagePriority, MessageStatus } from "@/lib/inbox/types";

// ============================================================================
// Filter Options
// ============================================================================

const SOURCE_OPTIONS: { value: MessageSource | "all"; label: string }[] = [
  { value: "all", label: "All Sources" },
  { value: "founder-ops", label: "Founder Ops" },
  { value: "fundraising", label: "Fundraising" },
  { value: "growth", label: "Growth" },
];

const PRIORITY_OPTIONS: { value: MessagePriority | "all"; label: string }[] = [
  { value: "all", label: "All Priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];

const STATUS_OPTIONS: { value: MessageStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "actioned", label: "Actioned" },
];

// ============================================================================
// Component
// ============================================================================

interface InboxFilterProps {
  filters: InboxFilters;
  onChange: (filters: InboxFilters) => void;
}

export function InboxFilter({ filters, onChange }: InboxFilterProps) {
  const hasActiveFilters = filters.source || filters.priority || filters.status;

  function handleSourceChange(value: string) {
    onChange({
      ...filters,
      source: value === "all" ? undefined : (value as MessageSource),
      offset: 0,
    });
  }

  function handlePriorityChange(value: string) {
    onChange({
      ...filters,
      priority: value === "all" ? undefined : (value as MessagePriority),
      offset: 0,
    });
  }

  function handleStatusChange(value: string) {
    onChange({
      ...filters,
      status: value === "all" ? undefined : (value as MessageStatus),
      offset: 0,
    });
  }

  function handleClear() {
    onChange({ limit: filters.limit });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Source filter */}
      <Select
        value={filters.source ?? "all"}
        onValueChange={handleSourceChange}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Sources" />
        </SelectTrigger>
        <SelectContent>
          {SOURCE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority filter */}
      <Select
        value={filters.priority ?? "all"}
        onValueChange={handlePriorityChange}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Priorities" />
        </SelectTrigger>
        <SelectContent>
          {PRIORITY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select
        value={filters.status ?? "all"}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
}
