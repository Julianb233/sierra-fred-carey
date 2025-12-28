/**
 * Export Types and Interfaces
 *
 * Type definitions for CSV export functionality including experiments,
 * variants, metrics, and export configuration options.
 */

/**
 * Supported export formats
 */
export type ExportFormat = 'csv' | 'json' | 'xlsx';

/**
 * Date range filter for exports
 */
export interface DateRangeFilter {
  startDate?: string | Date;
  endDate?: string | Date;
}

/**
 * Status filter options
 */
export type ExperimentStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type VariantStatus = 'active' | 'inactive' | 'winner' | 'loser';

/**
 * Column mapping configuration for flexible CSV output
 */
export interface ColumnMapping<T = Record<string, unknown>> {
  /** Field name in the source data */
  field: keyof T | string;
  /** Column header in the CSV */
  header: string;
  /** Optional formatter function */
  formatter?: (value: unknown, row: T) => string | number | boolean | null;
  /** Whether to include this column (default: true) */
  include?: boolean;
}

/**
 * Base export configuration
 */
export interface ExportConfig<T = Record<string, unknown>> {
  /** Column mappings for the export */
  columns: ColumnMapping<T>[];
  /** Filename without extension */
  filename: string;
  /** Export format */
  format?: ExportFormat;
  /** Include headers in output */
  includeHeaders?: boolean;
  /** CSV delimiter (default: ',') */
  delimiter?: string;
  /** Date format for date fields (default: ISO 8601) */
  dateFormat?: 'iso' | 'short' | 'long' | 'custom';
  /** Custom date format string (for dateFormat: 'custom') */
  customDateFormat?: string;
}

/**
 * Experiment data structure
 */
export interface Experiment {
  id: string;
  name: string;
  description?: string;
  status: ExperimentStatus;
  startDate: Date | string;
  endDate?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string;
  variantCount?: number;
  totalSamples?: number;
  conversionRate?: number;
  confidenceLevel?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Variant data structure
 */
export interface Variant {
  id: string;
  experimentId: string;
  name: string;
  description?: string;
  status: VariantStatus;
  trafficAllocation: number;
  samples: number;
  conversions: number;
  conversionRate: number;
  revenue?: number;
  avgOrderValue?: number;
  bounceRate?: number;
  timeOnPage?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  metadata?: Record<string, unknown>;
}

/**
 * Metric data structure
 */
export interface Metric {
  id: string;
  experimentId?: string;
  variantId?: string;
  name: string;
  value: number;
  unit?: string;
  timestamp: Date | string;
  category?: 'conversion' | 'engagement' | 'revenue' | 'performance' | 'custom';
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated metric data
 */
export interface AggregatedMetric {
  experimentId?: string;
  variantId?: string;
  metricName: string;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  stdDev?: number;
  period: string;
}

/**
 * Export filter options for experiments
 */
export interface ExperimentExportFilters {
  status?: ExperimentStatus | ExperimentStatus[];
  dateRange?: DateRangeFilter;
  tags?: string[];
  createdBy?: string;
  includeArchived?: boolean;
}

/**
 * Export filter options for metrics
 */
export interface MetricExportFilters {
  experimentId?: string | string[];
  variantId?: string | string[];
  category?: Metric['category'] | Metric['category'][];
  dateRange?: DateRangeFilter;
  aggregated?: boolean;
  aggregationPeriod?: 'hour' | 'day' | 'week' | 'month';
}

/**
 * Export filter options for variants
 */
export interface VariantExportFilters {
  experimentId: string;
  status?: VariantStatus | VariantStatus[];
  minSamples?: number;
  minConversionRate?: number;
}

/**
 * CSV generation options
 */
export interface CSVGeneratorOptions {
  /** Whether to quote all fields */
  quoteAll?: boolean;
  /** Quote character (default: '"') */
  quoteChar?: string;
  /** Escape character (default: '"') */
  escapeChar?: string;
  /** Line ending (default: '\n') */
  lineEnding?: '\n' | '\r\n';
  /** Whether to include BOM for Excel compatibility */
  includeBOM?: boolean;
}

/**
 * Stream-based export options for large datasets
 */
export interface StreamExportOptions<T> extends ExportConfig<T> {
  /** Batch size for streaming (default: 100) */
  batchSize?: number;
  /** Data fetcher function */
  fetchData: (offset: number, limit: number) => Promise<T[]>;
  /** Total record count (if known) */
  totalRecords?: number;
}

/**
 * Export result metadata
 */
export interface ExportResult {
  /** Export filename */
  filename: string;
  /** Number of records exported */
  recordCount: number;
  /** Export format */
  format: ExportFormat;
  /** File size in bytes */
  fileSize?: number;
  /** Export timestamp */
  timestamp: Date;
  /** Export duration in milliseconds */
  duration?: number;
  /** Any warnings encountered */
  warnings?: string[];
}

/**
 * Type guard for checking if a value is a valid date
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Type guard for checking if a value is a string date
 */
export function isStringDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return !isNaN(Date.parse(value));
}
