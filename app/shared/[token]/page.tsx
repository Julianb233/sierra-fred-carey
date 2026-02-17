/**
 * Shared Resource Viewer Page
 * Phase 33-02: Collaboration & Sharing
 *
 * Public page for viewing shared resources via token.
 * NO authentication required -- server component.
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SharedDocumentView } from "@/components/sharing/shared-document-view";

// ============================================================================
// Types
// ============================================================================

interface SharedPageProps {
  params: Promise<{ token: string }>;
}

interface ShareApiResponse {
  success: boolean;
  resourceType?: string;
  accessLevel?: string;
  resource?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Metadata
// ============================================================================

export const metadata: Metadata = {
  title: "Shared Resource | Sahara",
  description: "View a shared resource from the Sahara Founder Operating System.",
  robots: { index: false, follow: false },
};

// ============================================================================
// Data Fetching
// ============================================================================

const TOKEN_REGEX = /^[a-f0-9]{64}$/;

async function fetchSharedResource(
  token: string
): Promise<ShareApiResponse | null> {
  // Validate token format before making a request
  if (!token || !TOKEN_REGEX.test(token)) {
    return null;
  }

  try {
    // Use absolute URL for server-side fetch via environment or fallback
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const response = await fetch(`${baseUrl}/api/share/${token}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data: ShareApiResponse = await response.json();

    if (!data.success || !data.resource) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

// ============================================================================
// Page Component (Server)
// ============================================================================

export default async function SharedResourcePage({ params }: SharedPageProps) {
  const { token } = await params;

  const data = await fetchSharedResource(token);

  if (!data || !data.resource || !data.resourceType) {
    notFound();
  }

  return (
    <SharedDocumentView
      resource={data.resource}
      resourceType={data.resourceType}
    />
  );
}
