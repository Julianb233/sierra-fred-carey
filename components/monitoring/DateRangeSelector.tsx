"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

export type DateRangePreset = "1h" | "24h" | "7d" | "30d" | "90d" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  preset: DateRangePreset;
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const presets: { value: DateRangePreset; label: string }[] = [
  { value: "1h", label: "Last Hour" },
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
];

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

export function DateRangeSelector({ value, onChange, className }: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetChange = (preset: DateRangePreset) => {
    const range = getDateRangeFromPreset(preset);
    onChange({
      ...range,
      preset,
    });
    setIsOpen(false);
  };

  const getCurrentLabel = () => {
    const preset = presets.find((p) => p.value === value.preset);
    return preset?.label || "Custom Range";
  };

  return (
    <div className={cn("relative", className)}>
      <Select value={value.preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px]">
          <CalendarIcon className="mr-2 h-4 w-4" />
          <SelectValue>{getCurrentLabel()}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.preset !== "custom" && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {value.from.toLocaleDateString()} - {value.to.toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
