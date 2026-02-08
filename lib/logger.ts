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

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment =
  process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test";

// Build Pino options
const pinoOptions: pino.LoggerOptions = {
  level: isProduction ? "info" : "debug",
  base: { service: "sahara" },
  // Reduce noise in test environment
  ...(process.env.NODE_ENV === "test" ? { level: "silent" } : {}),
};

// Use pino-pretty transport only in development (not prod, not test)
const transport = isDevelopment
  ? pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss.l",
        ignore: "pid,hostname",
      },
    })
  : undefined;

const pinoInstance = transport ? pino(pinoOptions, transport) : pino(pinoOptions);

// ---------------------------------------------------------------------------
// Console-compatible logger interface
// ---------------------------------------------------------------------------
// The codebase uses console-style calls: logger.info("prefix", someObj)
// Pino expects: logger.info({ key: val }, "message")
// This wrapper bridges the gap so both styles work.

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

/**
 * Build a console-compatible wrapper around a pino logger instance.
 * Supports both console-style `(msg, data1, data2)` and pino-style `(obj, msg)`.
 */
function createWrapper(instance: pino.Logger): SaharaLogger {
  const makeLevel =
    (level: "debug" | "info" | "warn" | "error" | "fatal") =>
    (...args: unknown[]): void => {
      if (args.length === 0) {
        instance[level]("");
        return;
      }

      // Pino-style: first arg is an object with bindings, second is message string
      if (
        args.length >= 2 &&
        typeof args[0] === "object" &&
        args[0] !== null &&
        !Array.isArray(args[0]) &&
        !(args[0] instanceof Error) &&
        typeof args[1] === "string"
      ) {
        instance[level](args[0] as object, args[1], ...args.slice(2));
        return;
      }

      // Console-style: first arg is string, rest are extra data
      if (typeof args[0] === "string") {
        const msg = args[0];
        if (args.length === 1) {
          instance[level](msg);
        } else if (args.length === 2 && typeof args[1] === "object" && args[1] !== null && !(args[1] instanceof Error)) {
          // logger.info("some msg", { key: val }) -> pino.info({ key: val }, "some msg")
          instance[level](args[1] as object, msg);
        } else {
          // Multiple extra args -- pack them into a meta field
          instance[level]({ extra: args.slice(1) }, msg);
        }
        return;
      }

      // Single error object
      if (args[0] instanceof Error) {
        instance[level]({ err: args[0] }, args[0].message);
        return;
      }

      // Single object
      if (typeof args[0] === "object" && args[0] !== null) {
        instance[level](args[0] as object, "");
        return;
      }

      // Fallback: stringify everything
      instance[level](String(args[0]));
    };

  const wrapper: SaharaLogger = {
    debug: makeLevel("debug"),
    info: makeLevel("info"),
    warn: makeLevel("warn"),
    error: makeLevel("error"),
    fatal: makeLevel("fatal"),
    log: makeLevel("info"), // backward compat alias
    child(bindings: Record<string, unknown>): SaharaLogger {
      return createWrapper(instance.child(bindings));
    },
    _pino: instance,
  };

  return wrapper;
}

export const logger = createWrapper(pinoInstance);
