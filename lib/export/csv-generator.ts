/**
 * CSV Generator Utilities
 *
 * Generic CSV generation utilities with support for:
 * - Type-safe column mapping
 * - Custom formatters
 * - Proper escaping and quoting
 * - Stream-based processing for large datasets
 * - Excel compatibility (BOM support)
 */

import { format, parseISO } from 'date-fns';
import type {
  ColumnMapping,
  CSVGeneratorOptions,
  ExportConfig,
  ExportResult,
  StreamExportOptions,
  isValidDate,
  isStringDate,
} from './types';

/**
 * Default CSV generation options
 */
const DEFAULT_CSV_OPTIONS: Required<CSVGeneratorOptions> = {
  quoteAll: false,
  quoteChar: '"',
  escapeChar: '"',
  lineEnding: '\n',
  includeBOM: true, // Better Excel compatibility
};

/**
 * CSV Generator class for type-safe CSV generation
 */
export class CSVGenerator<T = Record<string, unknown>> {
  private config: ExportConfig<T>;
  private options: Required<CSVGeneratorOptions>;

  constructor(
    config: ExportConfig<T>,
    options: CSVGeneratorOptions = {}
  ) {
    this.config = {
      includeHeaders: true,
      delimiter: ',',
      format: 'csv',
      dateFormat: 'iso',
      ...config,
    };
    this.options = { ...DEFAULT_CSV_OPTIONS, ...options };
  }

  /**
   * Generate CSV from an array of records
   */
  public generate(data: T[]): string {
    const lines: string[] = [];

    // Add BOM for Excel compatibility
    if (this.options.includeBOM) {
      lines.push('\uFEFF');
    }

    // Add headers
    if (this.config.includeHeaders) {
      lines.push(this.generateHeaderRow());
    }

    // Add data rows
    for (const row of data) {
      lines.push(this.generateDataRow(row));
    }

    return lines.join('');
  }

  /**
   * Generate CSV asynchronously with streaming support
   */
  public async generateStream(
    options: StreamExportOptions<T>
  ): Promise<{ csv: string; result: ExportResult }> {
    const startTime = Date.now();
    const chunks: string[] = [];
    let totalRecords = 0;
    let offset = 0;
    const batchSize = options.batchSize || 100;

    // Add BOM
    if (this.options.includeBOM) {
      chunks.push('\uFEFF');
    }

    // Add headers
    if (this.config.includeHeaders) {
      chunks.push(this.generateHeaderRow());
    }

    // Fetch and process data in batches
    while (true) {
      const batch = await options.fetchData(offset, batchSize);

      if (batch.length === 0) {
        break;
      }

      for (const row of batch) {
        chunks.push(this.generateDataRow(row));
        totalRecords++;
      }

      offset += batch.length;

      // Break if we got less than batch size (last batch)
      if (batch.length < batchSize) {
        break;
      }
    }

    const csv = chunks.join('');
    const duration = Date.now() - startTime;

    const result: ExportResult = {
      filename: `${this.config.filename}.csv`,
      recordCount: totalRecords,
      format: 'csv',
      fileSize: new Blob([csv]).size,
      timestamp: new Date(),
      duration,
    };

    return { csv, result };
  }

  /**
   * Generate header row
   */
  private generateHeaderRow(): string {
    const headers = this.config.columns
      .filter((col) => col.include !== false)
      .map((col) => this.escapeValue(col.header));

    return headers.join(this.config.delimiter || ',') + this.options.lineEnding;
  }

  /**
   * Generate data row
   */
  private generateDataRow(row: T): string {
    const values = this.config.columns
      .filter((col) => col.include !== false)
      .map((col) => {
        const value = this.extractValue(row, col);
        const formatted = col.formatter
          ? col.formatter(value, row)
          : this.formatValue(value);
        return this.escapeValue(formatted);
      });

    return values.join(this.config.delimiter || ',') + this.options.lineEnding;
  }

  /**
   * Extract value from row using field path
   */
  private extractValue(row: T, column: ColumnMapping<T>): unknown {
    const field = column.field as string;

    // Support nested paths (e.g., 'metadata.value')
    if (field.includes('.')) {
      const parts = field.split('.');
      let value: unknown = row;

      for (const part of parts) {
        if (value === null || value === undefined) {
          return null;
        }
        value = (value as Record<string, unknown>)[part];
      }

      return value;
    }

    return (row as Record<string, unknown>)[field];
  }

  /**
   * Format value based on type and configuration
   */
  private formatValue(value: unknown): string {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return '';
    }

    // Handle dates
    if (value instanceof Date) {
      return this.formatDate(value);
    }

    // Handle string dates
    if (typeof value === 'string' && this.isDateString(value)) {
      try {
        const date = parseISO(value);
        return this.formatDate(date);
      } catch {
        return String(value);
      }
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.join('; ');
    }

    // Handle objects
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    // Handle booleans
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    // Handle numbers
    if (typeof value === 'number') {
      // Format percentages
      if (this.looksLikePercentage(value)) {
        return `${(value * 100).toFixed(2)}%`;
      }
      return String(value);
    }

    return String(value);
  }

  /**
   * Format date based on configuration
   */
  private formatDate(date: Date): string {
    if (!this.config.dateFormat) {
      return date.toISOString();
    }

    switch (this.config.dateFormat) {
      case 'iso':
        return date.toISOString();
      case 'short':
        return format(date, 'yyyy-MM-dd');
      case 'long':
        return format(date, 'yyyy-MM-dd HH:mm:ss');
      case 'custom':
        return this.config.customDateFormat
          ? format(date, this.config.customDateFormat)
          : date.toISOString();
      default:
        return date.toISOString();
    }
  }

  /**
   * Escape and quote CSV value
   */
  private escapeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    let str = String(value);
    const delimiter = this.config.delimiter || ',';
    const needsQuoting =
      this.options.quoteAll ||
      str.includes(delimiter) ||
      str.includes(this.options.quoteChar) ||
      str.includes('\n') ||
      str.includes('\r');

    if (needsQuoting) {
      // Escape quote characters
      str = str.replace(
        new RegExp(this.options.quoteChar, 'g'),
        this.options.escapeChar + this.options.quoteChar
      );
      return this.options.quoteChar + str + this.options.quoteChar;
    }

    return str;
  }

  /**
   * Check if string looks like an ISO date
   */
  private isDateString(value: string): boolean {
    // Simple check for ISO 8601 format
    const isoPattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
    return isoPattern.test(value);
  }

  /**
   * Check if number looks like a percentage (0-1 range)
   */
  private looksLikePercentage(value: number): boolean {
    return value >= 0 && value <= 1 && value !== 0 && value !== 1;
  }
}

/**
 * Quick CSV generation utility function
 */
export function generateCSV<T>(
  data: T[],
  config: ExportConfig<T>,
  options?: CSVGeneratorOptions
): string {
  const generator = new CSVGenerator(config, options);
  return generator.generate(data);
}

/**
 * Generate CSV and trigger download in browser
 */
export function downloadCSV(
  csv: string,
  filename: string,
  mimeType: string = 'text/csv;charset=utf-8;'
): void {
  const blob = new Blob([csv], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert CSV to JSON (for format conversion)
 */
export function csvToJSON<T = Record<string, string>>(
  csv: string,
  options: {
    delimiter?: string;
    hasHeaders?: boolean;
    skipEmptyLines?: boolean;
  } = {}
): T[] {
  const { delimiter = ',', hasHeaders = true, skipEmptyLines = true } = options;

  const lines = csv.split(/\r?\n/);

  if (skipEmptyLines) {
    lines.filter((line) => line.trim() !== '');
  }

  if (lines.length === 0) {
    return [];
  }

  const headers = hasHeaders
    ? parseCSVLine(lines[0], delimiter)
    : Array.from({ length: parseCSVLine(lines[0], delimiter).length }, (_, i) => `col${i}`);

  const startIndex = hasHeaders ? 1 : 0;
  const results: T[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    if (skipEmptyLines && !lines[i].trim()) {
      continue;
    }

    const values = parseCSVLine(lines[i], delimiter);
    const obj: Record<string, string> = {};

    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });

    results.push(obj as unknown as T);
  }

  return results;
}

/**
 * Parse a single CSV line handling quotes and escapes
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i += 2;
        continue;
      }
      // Toggle quote state
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  result.push(current);
  return result;
}

/**
 * Sanitize filename for safe downloads
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9_\-\.]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Generate timestamp for filename
 */
export function getTimestampedFilename(
  baseName: string,
  extension: string = 'csv'
): string {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const sanitized = sanitizeFilename(baseName);
  return `${sanitized}_${timestamp}.${extension}`;
}
