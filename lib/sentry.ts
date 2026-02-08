import * as Sentry from "@sentry/nextjs";

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  if (context) Sentry.setContext("custom", context);
  Sentry.captureException(error);
}

export function captureMessage(message: string, level?: Sentry.SeverityLevel) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  Sentry.captureMessage(message, level);
}

export function setUserContext(userId: string, tier: string) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  Sentry.setUser({ id: userId });
  Sentry.setTag("tier", tier);
}

export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  Sentry.addBreadcrumb({ message, category, data });
}
