"use client";

/**
 * Floating "Download PDF" button for the founder progress report (AI-7369).
 * Links to GET /api/progress-report/[id]/pdf which streams an attachment.
 */

interface Props {
  reportId: string;
}

export default function DownloadPdfButton({ reportId }: Props) {
  return (
    <a
      href={`/api/progress-report/${reportId}/pdf`}
      download
      aria-label="Download this report as a PDF"
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 1000,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "#ff6a1a",
        color: "#ffffff",
        textDecoration: "none",
        padding: "10px 16px",
        borderRadius: 8,
        fontFamily:
          '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontSize: 14,
        fontWeight: 600,
        boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Download PDF
    </a>
  );
}
