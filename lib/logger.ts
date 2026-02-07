/**
 * Production-aware logger.
 *
 * - `logger.info()` / `logger.log()` — suppressed in production
 * - `logger.warn()` / `logger.error()` — always emitted
 *
 * Drop-in replacement for console.log in non-test code.
 */

const isProduction = process.env.NODE_ENV === "production";

function noop(..._args: unknown[]) {
  // intentionally empty
}

export const logger = {
  /** Debug-level log, suppressed in production */
  log: isProduction ? noop : console.log.bind(console),
  /** Alias for log */
  info: isProduction ? noop : console.log.bind(console),
  /** Warning — always emitted */
  warn: console.warn.bind(console),
  /** Error — always emitted */
  error: console.error.bind(console),
};
