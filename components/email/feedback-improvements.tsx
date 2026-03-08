/**
 * Monthly Feedback Improvements Digest Email
 * Phase 76: Close-the-Loop (REQ-L2)
 *
 * React Email template showing improvements made based on founder feedback.
 */

import * as React from "react"

interface ImprovementItem {
  topic: string
  description: string
  signalCount: number
  improvementPercent: number | null
}

interface ImprovementsDigestEmailProps {
  founderName: string
  improvements: ImprovementItem[]
  appUrl: string
}

// Alias for backward compatibility
export const FeedbackImprovementsEmail = ImprovementsDigestEmail

export function ImprovementsDigestEmail({
  founderName,
  improvements,
  appUrl,
}: ImprovementsDigestEmailProps) {
  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: 600,
        margin: "0 auto",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#1a1a1a",
          padding: "32px 24px",
          textAlign: "center" as const,
        }}
      >
        <h1
          style={{
            color: "#ff6a1a",
            fontSize: 24,
            fontWeight: 700,
            margin: 0,
          }}
        >
          Sahara
        </h1>
        <p
          style={{
            color: "#cccccc",
            fontSize: 14,
            margin: "8px 0 0",
          }}
        >
          Your feedback made FRED better
        </p>
      </div>

      {/* Body */}
      <div style={{ padding: "32px 24px" }}>
        <p
          style={{
            fontSize: 16,
            color: "#333333",
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}
        >
          Hi {founderName},
        </p>
        <p
          style={{
            fontSize: 16,
            color: "#333333",
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}
        >
          Thanks to your feedback, we have made the following improvements to
          FRED this month:
        </p>

        {/* Improvements List */}
        <div style={{ margin: "0 0 32px" }}>
          {improvements.map((item, index) => (
            <div
              key={index}
              style={{
                borderLeft: "3px solid #ff6a1a",
                padding: "12px 16px",
                marginBottom: 16,
                backgroundColor: "#fafafa",
                borderRadius: "0 8px 8px 0",
              }}
            >
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#1a1a1a",
                  margin: "0 0 4px",
                }}
              >
                {item.topic}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "#555555",
                  margin: "0 0 4px",
                  lineHeight: 1.5,
                }}
              >
                {item.description}
              </p>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {item.improvementPercent !== null && item.improvementPercent > 0 && (
                  <span
                    style={{
                      fontSize: 13,
                      color: "#ff6a1a",
                      fontWeight: 600,
                    }}
                  >
                    +{item.improvementPercent}% satisfaction
                  </span>
                )}
                <span
                  style={{
                    fontSize: 12,
                    color: "#999999",
                  }}
                >
                  Based on {item.signalCount} feedback{" "}
                  {item.signalCount === 1 ? "signal" : "signals"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" as const, margin: "32px 0" }}>
          <a
            href={`${appUrl}/chat`}
            style={{
              display: "inline-block",
              backgroundColor: "#ff6a1a",
              color: "#ffffff",
              padding: "12px 32px",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Chat with FRED
          </a>
        </div>

        <p
          style={{
            fontSize: 14,
            color: "#666666",
            lineHeight: 1.6,
            margin: "24px 0 0",
          }}
        >
          Your feedback helps FRED become a better mentor for all founders. Keep
          using the thumbs up/down buttons to let us know how we are doing.
        </p>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #eeeeee",
          padding: "24px",
          textAlign: "center" as const,
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: "#999999",
            margin: 0,
          }}
        >
          Sahara - Your Founder Operating System
          <br />
          <a
            href={`${appUrl}/settings/notifications`}
            style={{ color: "#ff6a1a", textDecoration: "underline" }}
          >
            Manage notification preferences
          </a>
        </p>
      </div>
    </div>
  )
}
