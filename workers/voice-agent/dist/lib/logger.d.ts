/**
 * Structured logger using Pino.
 *
 * Phase 25-02: Replaces the previous console-based wrapper with
 * Pino for JSON-structured logging in production and human-readable
 * output in development via pino-pretty.
 *
 * Backward-compatible interface:
 * - logger.log(msg, ...args)   -> mapped to logger.info(msg, ...args)
 * - logger.info(msg, ...args)  -> pino info
 * - logger.warn(msg, ...args)  -> pino warn
 * - logger.error(msg, ...args) -> pino error
 * - logger.fatal(msg, ...args) -> pino fatal (new)
 * - logger.debug(msg, ...args) -> pino debug (new)
 * - logger.child(bindings)     -> pino child logger for scoped context
 *
 * NOTE: Existing callers use console-style `logger.info("msg", data)`
 * (string first, object second). Pino's native API expects the reverse:
 * `logger.info(obj, "msg")`. This wrapper adapts by accepting both
 * calling conventions via variadic args.
 */
import pino from "pino";
export interface SaharaLogger {
    /** Alias for info (backward compat with console.log) */
    log: (...args: unknown[]) => void;
    /** Debug level */
    debug: (...args: unknown[]) => void;
    /** Info level */
    info: (...args: unknown[]) => void;
    /** Warning level */
    warn: (...args: unknown[]) => void;
    /** Error level */
    error: (...args: unknown[]) => void;
    /** Fatal (critical) level */
    fatal: (...args: unknown[]) => void;
    /** Create a child logger with additional bindings */
    child: (bindings: Record<string, unknown>) => SaharaLogger;
    /** The underlying pino instance (for advanced use) */
    _pino: pino.Logger;
}
export declare const logger: SaharaLogger;
