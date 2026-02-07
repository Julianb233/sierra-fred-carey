/**
 * URL Validator & SSRF Protection
 *
 * Validates URLs to prevent Server-Side Request Forgery (SSRF) attacks.
 * Blocks private IPs, non-HTTPS URLs, and non-standard ports.
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface URLValidationResult {
  isValid: boolean;
  reason?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  reason?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

const ALLOWED_PORTS = new Set([80, 443]);

// Private/reserved IP ranges (CIDR notation patterns)
const PRIVATE_IP_PATTERNS = [
  /^127\./,                    // 127.0.0.0/8 (loopback)
  /^10\./,                     // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./,               // 192.168.0.0/16
  /^0\./,                      // 0.0.0.0/8
  /^169\.254\./,               // 169.254.0.0/16 (link-local)
  /^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./, // 100.64.0.0/10 (carrier-grade NAT)
  /^198\.1[89]\./,             // 198.18.0.0/15 (benchmarking)
  /^::1$/,                     // IPv6 loopback
  /^fc00:/i,                   // IPv6 ULA
  /^fe80:/i,                   // IPv6 link-local
  /^fd/i,                      // IPv6 ULA
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",  // GCP metadata
  "169.254.169.254",           // AWS/GCP/Azure metadata endpoint
  "metadata.google",
  "kubernetes.default",
  "kubernetes.default.svc",
]);

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Validate a URL for safe server-side fetching.
 * Blocks private IPs, non-HTTPS, metadata endpoints, and non-standard ports.
 */
export function validateURL(urlString: string): URLValidationResult {
  let parsed: URL;

  try {
    parsed = new URL(urlString);
  } catch {
    return { isValid: false, reason: "Invalid URL format" };
  }

  // Protocol check — only HTTPS allowed
  if (parsed.protocol !== "https:") {
    return { isValid: false, reason: `Protocol '${parsed.protocol}' not allowed. Only HTTPS is permitted.` };
  }

  // Port check
  if (parsed.port && !ALLOWED_PORTS.has(parseInt(parsed.port, 10))) {
    return { isValid: false, reason: `Port ${parsed.port} not allowed` };
  }

  // Hostname checks
  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    logger.log(`[URLValidator] Blocked hostname: ${hostname}`);
    return { isValid: false, reason: "Hostname not allowed" };
  }

  // IP address check
  if (isPrivateIP(hostname)) {
    logger.log(`[URLValidator] Blocked private IP: ${hostname}`);
    return { isValid: false, reason: "Private/reserved IP addresses not allowed" };
  }

  // Block IP addresses entirely (DNS rebinding protection)
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return { isValid: false, reason: "Direct IP addresses not allowed. Use domain names." };
  }

  // Block IPv6 addresses
  if (hostname.startsWith("[") || hostname.includes(":")) {
    return { isValid: false, reason: "IPv6 addresses not allowed. Use domain names." };
  }

  return { isValid: true };
}

/**
 * Validate file size before downloading/processing.
 */
export function validateFileSize(
  sizeBytes: number,
  maxBytes: number = MAX_FILE_SIZE_BYTES
): FileValidationResult {
  if (sizeBytes <= 0) {
    return { isValid: false, reason: "File size must be positive" };
  }

  if (sizeBytes > maxBytes) {
    const maxMB = Math.round(maxBytes / (1024 * 1024));
    const actualMB = Math.round(sizeBytes / (1024 * 1024));
    return {
      isValid: false,
      reason: `File size (${actualMB}MB) exceeds maximum allowed size (${maxMB}MB)`,
    };
  }

  return { isValid: true };
}

/**
 * Validate a Content-Length header before downloading.
 */
export function validateContentLength(
  contentLength: string | null,
  maxBytes: number = MAX_FILE_SIZE_BYTES
): FileValidationResult {
  if (!contentLength) {
    // No content-length header — allow but monitor during download
    return { isValid: true };
  }

  const size = parseInt(contentLength, 10);
  if (isNaN(size)) {
    return { isValid: false, reason: "Invalid Content-Length header" };
  }

  return validateFileSize(size, maxBytes);
}

// ============================================================================
// Internal Helpers
// ============================================================================

function isPrivateIP(hostname: string): boolean {
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return true;
    }
  }
  return false;
}
