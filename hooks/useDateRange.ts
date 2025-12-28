"use client";

import { useState, useCallback } from "react";
import type { DateRange, DateRangePreset } from "@/components/monitoring/DateRangeSelector";

function getDateRangeFromPreset(preset: DateRangePreset): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date();

  switch (preset) {
    case "1h":
      from.setHours(now.getHours() - 1);
      break;
    case "24h":
      from.setDate(now.getDate() - 1);
      break;
    case "7d":
      from.setDate(now.getDate() - 7);
      break;
    case "30d":
      from.setDate(now.getDate() - 30);
      break;
    case "90d":
      from.setDate(now.getDate() - 90);
      break;
    default:
      from.setDate(now.getDate() - 7);
  }

  return { from, to: now };
}

export interface UseDateRangeReturn {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  setPreset: (preset: DateRangePreset) => void;
  isInRange: (date: Date) => boolean;
  formatRange: () => string;
}

export function useDateRange(initialPreset: DateRangePreset = "7d"): UseDateRangeReturn {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const range = getDateRangeFromPreset(initialPreset);
    return {
      ...range,
      preset: initialPreset,
    };
  });

  const setPreset = useCallback((preset: DateRangePreset) => {
    const range = getDateRangeFromPreset(preset);
    setDateRange({
      ...range,
      preset,
    });
  }, []);

  const isInRange = useCallback(
    (date: Date) => {
      return date >= dateRange.from && date <= dateRange.to;
    },
    [dateRange]
  );

  const formatRange = useCallback(() => {
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: dateRange.from.getFullYear() !== dateRange.to.getFullYear() ? "numeric" : undefined,
    };

    const fromStr = dateRange.from.toLocaleDateString(undefined, options);
    const toStr = dateRange.to.toLocaleDateString(undefined, options);

    return `${fromStr} - ${toStr}`;
  }, [dateRange]);

  return {
    dateRange,
    setDateRange,
    setPreset,
    isInRange,
    formatRange,
  };
}
