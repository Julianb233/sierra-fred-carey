/**
 * Investor CSV Parser
 * Phase 20: Investor Targeting
 *
 * Parses CSV text into structured investor rows with flexible header mapping,
 * dollar amount parsing, and validation. No external dependencies.
 */

// ============================================================================
// Types
// ============================================================================

export interface InvestorRow {
  name: string;
  firm?: string;
  email?: string;
  website?: string;
  stageFocus?: string[];
  sectorFocus?: string[];
  checkSizeMin?: number;
  checkSizeMax?: number;
  location?: string;
  notes?: string;
  rawData: Record<string, string>;
}

export interface ParseResult {
  rows: InvestorRow[];
  errors: string[];
}

// ============================================================================
// Header Mapping
// ============================================================================

/** Map of normalized header names to InvestorRow fields */
const HEADER_ALIASES: Record<string, keyof InvestorRow> = {
  // Name
  "name": "name",
  "investor name": "name",
  "investor": "name",
  "contact": "name",
  "contact name": "name",
  "full name": "name",

  // Firm
  "firm": "firm",
  "fund": "firm",
  "company": "firm",
  "organization": "firm",
  "org": "firm",
  "fund name": "firm",
  "firm name": "firm",
  "vc firm": "firm",

  // Email
  "email": "email",
  "email address": "email",
  "e-mail": "email",
  "contact email": "email",

  // Website
  "website": "website",
  "url": "website",
  "site": "website",
  "web": "website",
  "homepage": "website",

  // Stage focus
  "stage": "stageFocus",
  "stage focus": "stageFocus",
  "stage preference": "stageFocus",
  "stages": "stageFocus",
  "investment stage": "stageFocus",
  "preferred stage": "stageFocus",

  // Sector focus
  "sector": "sectorFocus",
  "sector focus": "sectorFocus",
  "industry": "sectorFocus",
  "vertical": "sectorFocus",
  "sectors": "sectorFocus",
  "industries": "sectorFocus",
  "focus area": "sectorFocus",
  "focus areas": "sectorFocus",

  // Check size min
  "check size": "checkSizeMin",
  "ticket size": "checkSizeMin",
  "min check": "checkSizeMin",
  "check size min": "checkSizeMin",
  "minimum check": "checkSizeMin",
  "min investment": "checkSizeMin",

  // Check size max
  "max check": "checkSizeMax",
  "check size max": "checkSizeMax",
  "maximum check": "checkSizeMax",
  "max investment": "checkSizeMax",

  // Location
  "location": "location",
  "city": "location",
  "geography": "location",
  "geo": "location",
  "region": "location",
  "hq": "location",

  // Notes
  "notes": "notes",
  "comments": "notes",
  "description": "notes",
  "additional info": "notes",
};

// ============================================================================
// Dollar Amount Parsing
// ============================================================================

/**
 * Parse dollar amount strings into numeric values.
 * Handles: "$500K", "500k", "$2M", "2m", "$1,000,000", "500000", "$2.5M"
 */
export function parseDollarAmount(value: string): number | undefined {
  if (!value || !value.trim()) return undefined;

  let cleaned = value.trim()
    .replace(/^\$/, "")        // Remove leading $
    .replace(/,/g, "")         // Remove commas
    .trim();

  if (!cleaned) return undefined;

  // Check for K/M/B suffixes
  const suffixMatch = cleaned.match(/^([\d.]+)\s*([KkMmBb])$/);
  if (suffixMatch) {
    const num = parseFloat(suffixMatch[1]);
    if (isNaN(num)) return undefined;

    const suffix = suffixMatch[2].toUpperCase();
    switch (suffix) {
      case "K": return Math.round(num * 1_000);
      case "M": return Math.round(num * 1_000_000);
      case "B": return Math.round(num * 1_000_000_000);
    }
  }

  // Plain number
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : Math.round(num);
}

// ============================================================================
// CSV Line Parsing
// ============================================================================

/**
 * Parse a single CSV line respecting quoted fields.
 * Handles: commas inside quotes, escaped quotes (""), etc.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Split a delimited string (comma or semicolon) into an array of trimmed values.
 */
function splitMultiValue(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse CSV text into structured investor rows with validation.
 *
 * @param csvText - Raw CSV content as string
 * @returns Parsed rows and any validation errors
 *
 * @example
 * const { rows, errors } = parseInvestorCSV(csvContent);
 * console.log(`Parsed ${rows.length} investors, ${errors.length} errors`);
 */
export function parseInvestorCSV(csvText: string): ParseResult {
  const errors: string[] = [];
  const rows: InvestorRow[] = [];

  // Split into lines, removing empty lines and BOM
  const lines = csvText
    .replace(/^\uFEFF/, "") // Remove BOM
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    errors.push("CSV must have a header row and at least one data row");
    return { rows, errors };
  }

  // Parse header row
  const headerFields = parseCSVLine(lines[0]);
  const columnMap: Map<number, keyof InvestorRow> = new Map();

  for (let i = 0; i < headerFields.length; i++) {
    const normalized = headerFields[i].toLowerCase().trim();
    const mapped = HEADER_ALIASES[normalized];
    if (mapped) {
      columnMap.set(i, mapped);
    }
  }

  // Check that we have at least a name mapping
  const hasNameColumn = Array.from(columnMap.values()).includes("name");
  if (!hasNameColumn) {
    errors.push(
      `Could not find a "name" column. Found headers: ${headerFields.join(", ")}. ` +
      `Accepted name headers: name, investor name, investor, contact, full name`
    );
    return { rows, errors };
  }

  // Parse data rows
  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const fields = parseCSVLine(lines[lineIdx]);

    // Build raw data
    const rawData: Record<string, string> = {};
    for (let i = 0; i < fields.length; i++) {
      const header = headerFields[i] || `column_${i}`;
      rawData[header] = fields[i];
    }

    // Map fields to InvestorRow
    const row: Partial<InvestorRow> = { rawData };

    for (const [colIdx, field] of columnMap.entries()) {
      const value = fields[colIdx];
      if (!value || !value.trim()) continue;

      switch (field) {
        case "name":
          row.name = value;
          break;
        case "firm":
          row.firm = value;
          break;
        case "email":
          row.email = value;
          break;
        case "website":
          row.website = value;
          break;
        case "stageFocus":
          row.stageFocus = splitMultiValue(value);
          break;
        case "sectorFocus":
          row.sectorFocus = splitMultiValue(value);
          break;
        case "checkSizeMin":
          row.checkSizeMin = parseDollarAmount(value);
          break;
        case "checkSizeMax":
          row.checkSizeMax = parseDollarAmount(value);
          break;
        case "location":
          row.location = value;
          break;
        case "notes":
          row.notes = value;
          break;
      }
    }

    // Validate: name is required
    if (!row.name || !row.name.trim()) {
      errors.push(`Row ${lineIdx + 1}: Missing required "name" field, skipping`);
      continue;
    }

    rows.push(row as InvestorRow);
  }

  return { rows, errors };
}
