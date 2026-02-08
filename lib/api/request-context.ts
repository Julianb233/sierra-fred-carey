/**
 * Async-local request context for propagating correlation IDs
 * through the call stack without explicit parameter threading.
 *
 * Phase 25-02: Structured Logging & CI Quality Gates
 */

import { AsyncLocalStorage } from "node:async_hooks";

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

/**
 * Retrieve the current request's correlation ID, if available.
 * Returns `undefined` when called outside of a request context.
 */
export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}
