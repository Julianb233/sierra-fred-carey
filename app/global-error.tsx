"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          color: "#e5e5e5",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ padding: "2rem", textAlign: "center", maxWidth: "480px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(249, 115, 22, 0.15)",
              border: "2px solid #f97316",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              fontSize: "1.5rem",
            }}
          >
            !
          </div>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.5rem", color: "#fff" }}>
            Something went wrong
          </h2>
          <p style={{ margin: "0 0 1rem", color: "#a3a3a3", lineHeight: 1.6 }}>
            {error.message || "An unexpected error occurred."}
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: "0.8rem",
                color: "#737373",
                fontFamily: "monospace",
                margin: "0 0 1.5rem",
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              marginTop: "0.5rem",
              padding: "0.625rem 1.5rem",
              cursor: "pointer",
              backgroundColor: "#f97316",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
