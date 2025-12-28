/**
 * Utility functions for formatting metrics and data
 */

import { formatDistanceToNow } from "date-fns";

export function formatNumber(num: number, decimals: number = 1): string {
  if (num < 1000) return num.toString();
  const units = ["", "K", "M", "B", "T"];
  const order = Math.floor(Math.log10(Math.abs(num)) / 3);
  const unitIndex = Math.min(order, units.length - 1);
  const scaledNum = num / Math.pow(1000, unitIndex);
  const formatted = scaledNum.toFixed(decimals).replace(/\.?0+$/, "");
  return `${formatted}${units[unitIndex]}`;
}

export function formatLatency(ms: number): string {
  if (ms < 0.5) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatPercentage(value: number, decimals: number = 1, includeSign: boolean = false): string {
  const sign = includeSign && value > 0 ? "+" : "";
  const formatted = value.toFixed(decimals).replace(/\.?0+$/, "");
  return `${sign}${formatted}%`;
}

export function formatTimestamp(timestamp: string | Date, short: boolean = false): string {
  try {
    const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    if (isNaN(date.getTime())) return "Invalid date";
    const distance = formatDistanceToNow(date, { addSuffix: true });
    if (!short) return distance;
    return distance
      .replace("about ", "")
      .replace("less than a minute", "<1m")
      .replace(" minutes", "m")
      .replace(" minute", "m")
      .replace(" hours", "h")
      .replace(" hour", "h")
      .replace(" days", "d")
      .replace(" day", "d")
      .replace(" ago", "");
  } catch {
    return "Invalid date";
  }
}

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`;
}

export function formatDuration(ms: number, verbose: boolean = false): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return verbose
      ? `${days} day${days > 1 ? "s" : ""} ${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`
      : `${days}d ${remainingHours}h`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return verbose
      ? `${hours} hour${hours > 1 ? "s" : ""} ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}`
      : `${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return verbose
      ? `${minutes} minute${minutes > 1 ? "s" : ""} ${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""}`
      : `${minutes}m ${remainingSeconds}s`;
  }
  return verbose ? `${seconds} second${seconds !== 1 ? "s" : ""}` : `${seconds}s`;
}

export function getMetricColor(value: number, type: "uptime" | "latency" | "error_rate" | "success_rate"): string {
  switch (type) {
    case "uptime":
    case "success_rate":
      if (value >= 99.5) return "text-green-600 dark:text-green-400";
      if (value >= 95) return "text-yellow-600 dark:text-yellow-400";
      return "text-red-600 dark:text-red-400";
    case "latency":
      if (value < 100) return "text-green-600 dark:text-green-400";
      if (value < 500) return "text-yellow-600 dark:text-yellow-400";
      return "text-red-600 dark:text-red-400";
    case "error_rate":
      if (value < 1) return "text-green-600 dark:text-green-400";
      if (value < 5) return "text-yellow-600 dark:text-yellow-400";
      return "text-red-600 dark:text-red-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}
