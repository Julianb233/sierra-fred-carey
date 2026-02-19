import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.2,
    profilesSampleRate: 0.1,
    ignoreErrors: [
      "NEXT_NOT_FOUND",
      "NEXT_REDIRECT",
      "AbortError",
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "UND_ERR_CONNECT_TIMEOUT",
    ],
    beforeSend(event) {
      const msg = event.exception?.values?.[0]?.value || "";
      if (/ResizeObserver loop|AbortError|network timeout/i.test(msg))
        return null;
      return event;
    },
  });
}
