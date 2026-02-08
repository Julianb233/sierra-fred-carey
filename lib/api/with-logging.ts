/**
 * Higher-order function wrapping Next.js API route handlers with
 * structured request logging and correlation ID propagation.
 *
 * Phase 25-02: Structured Logging & CI Quality Gates
 */

import { logger } from "@/lib/logger";

/**
 * Wrap a Next.js App Router route handler with structured logging.
 *
 * - Extracts or generates an `X-Request-ID` for correlation
 * - Logs request start and completion/failure with duration
 * - Catches unhandled errors and returns a 500 with the correlation ID
 */
export function withLogging(handler: (request: Request, context?: unknown) => Promise<Response>) {
  return async (request: Request, context?: unknown): Promise<Response> => {
    const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
    const start = Date.now();
    const childLogger = logger.child({
      requestId,
      method: request.method,
      url: request.url,
    });

    childLogger.info("API request started");

    try {
      const response = await handler(request, context);
      childLogger.info(
        { durationMs: Date.now() - start, status: response.status },
        "API request completed"
      );

      // Propagate correlation ID on the outgoing response
      response.headers.set("X-Request-ID", requestId);
      return response;
    } catch (err) {
      childLogger.error(
        { err, durationMs: Date.now() - start },
        "API request failed"
      );

      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: {
            "X-Request-ID": requestId,
            "Content-Type": "application/json",
          },
        }
      );
    }
  };
}
