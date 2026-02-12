/**
 * Documents Page Tests
 * Phase 44: Document Repository
 *
 * Tests for /dashboard/documents page and DocumentCard component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DocumentsPage from "@/app/dashboard/documents/page";
import { DocumentCard } from "@/components/dashboard/document-card";
import type { DocumentItem } from "@/components/dashboard/document-card";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock useUserTier
const mockUseUserTier = vi.fn();
vi.mock("@/lib/context/tier-context", () => ({
  useUserTier: () => mockUseUserTier(),
  useTier: () => ({ tier: 1, isLoading: false }),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockApiResponse = {
  success: true,
  data: {
    decks: [
      {
        id: "deck-1",
        name: "Series A Deck",
        type: "pitch_deck",
        category: "decks",
        fileUrl: "https://example.com/deck.pdf",
        pageCount: 12,
        status: "ready",
        createdAt: "2026-02-10T00:00:00Z",
        updatedAt: "2026-02-10T00:00:00Z",
        canReviewWithFred: true,
      },
    ],
    strategyDocs: [
      {
        id: "strat-1",
        name: "Executive Summary",
        type: "executive_summary",
        category: "strategy",
        fileUrl: null,
        pageCount: null,
        status: "ready",
        createdAt: "2026-02-09T00:00:00Z",
        updatedAt: "2026-02-09T00:00:00Z",
        canReviewWithFred: true,
      },
      {
        id: "strat-2",
        name: "Market Analysis",
        type: "market_analysis",
        category: "strategy",
        fileUrl: null,
        pageCount: null,
        status: "ready",
        createdAt: "2026-02-08T00:00:00Z",
        updatedAt: "2026-02-08T00:00:00Z",
        canReviewWithFred: true,
      },
    ],
    reports: [
      {
        id: "strat-2",
        name: "Market Analysis",
        type: "market_analysis",
        category: "reports",
        fileUrl: null,
        pageCount: null,
        status: "ready",
        createdAt: "2026-02-08T00:00:00Z",
        updatedAt: "2026-02-08T00:00:00Z",
        canReviewWithFred: true,
      },
    ],
    uploadedFiles: [
      {
        id: "upload-1",
        name: "Financial Model.pdf",
        type: "financial",
        category: "uploads",
        fileUrl: "https://example.com/model.pdf",
        pageCount: 5,
        status: "ready",
        createdAt: "2026-02-07T00:00:00Z",
        updatedAt: "2026-02-07T00:00:00Z",
        canReviewWithFred: false,
      },
    ],
    totalCount: 4,
  },
};

const emptyApiResponse = {
  success: true,
  data: {
    decks: [],
    strategyDocs: [],
    reports: [],
    uploadedFiles: [],
    totalCount: 0,
  },
};

// ============================================================================
// DocumentsPage Tests
// ============================================================================

describe("Documents Page (/dashboard/documents)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockUseUserTier.mockReturnValue({ tier: 1, isLoading: false });
  });

  it("renders loading state while tier is loading", () => {
    mockUseUserTier.mockReturnValue({ tier: 0, isLoading: true });
    render(<DocumentsPage />);
    // Should show spinner (no heading yet)
    expect(screen.queryByText("Documents")).not.toBeInTheDocument();
  });

  it("renders the page header after loading", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(mockApiResponse),
    });

    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Documents")).toBeInTheDocument();
    });
  });

  it("renders all four folder tabs", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(mockApiResponse),
    });

    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Decks")).toBeInTheDocument();
      expect(screen.getByText("Strategy Docs")).toBeInTheDocument();
      expect(screen.getByText("Reports")).toBeInTheDocument();
      expect(screen.getByText("Uploaded Files")).toBeInTheDocument();
    });
  });

  it("shows document count badges on tabs", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(mockApiResponse),
    });

    render(<DocumentsPage />);

    await waitFor(() => {
      // Decks tab should show (1)
      const oneCountBadges = screen.getAllByText("(1)");
      expect(oneCountBadges.length).toBeGreaterThanOrEqual(1);
      // Strategy Docs tab should show (2)
      expect(screen.getByText("(2)")).toBeInTheDocument();
    });
  });

  it("renders deck documents in the default Decks tab", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(mockApiResponse),
    });

    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Series A Deck")).toBeInTheDocument();
    });
  });

  it("shows empty state when no documents exist", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(emptyApiResponse),
    });

    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("No documents yet")).toBeInTheDocument();
    });
  });

  it("shows error state when API fails", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: false, error: "Server error" }),
    });

    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("renders search input", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(mockApiResponse),
    });

    render(<DocumentsPage />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search documents...")
      ).toBeInTheDocument();
    });
  });

  it("renders Generate Doc button linking to strategy page", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(mockApiResponse),
    });

    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Generate Doc")).toBeInTheDocument();
      const link = screen.getByText("Generate Doc").closest("a");
      expect(link).toHaveAttribute("href", "/dashboard/strategy");
    });
  });

  it("calls the unified documents API endpoint", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(mockApiResponse),
    });

    render(<DocumentsPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/dashboard/documents");
    });
  });
});

// ============================================================================
// DocumentCard Tests
// ============================================================================

describe("DocumentCard", () => {
  const mockDoc: DocumentItem = {
    id: "doc-1",
    name: "Test Document",
    type: "pitch_deck",
    folder: "decks",
    source: "uploaded",
    status: "ready",
    createdAt: "2026-02-10T00:00:00Z",
    pageCount: 10,
  };

  it("renders document name", () => {
    render(
      <DocumentCard
        document={mockDoc}
        onView={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("Test Document")).toBeInTheDocument();
  });

  it("renders page count when available", () => {
    render(
      <DocumentCard
        document={mockDoc}
        onView={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("10 pages")).toBeInTheDocument();
  });

  it("renders View button", () => {
    render(
      <DocumentCard
        document={mockDoc}
        onView={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("View")).toBeInTheDocument();
  });

  it("renders Review with Fred button as a link", () => {
    render(
      <DocumentCard
        document={mockDoc}
        onView={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("Review with Fred")).toBeInTheDocument();
    const link = screen.getByText("Review with Fred").closest("a");
    expect(link).toHaveAttribute("href", "/chat?documentId=doc-1");
  });

  it("shows Processing badge when status is processing", () => {
    const processingDoc: DocumentItem = { ...mockDoc, status: "processing" };
    render(
      <DocumentCard
        document={processingDoc}
        onView={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });

  it("renders a date string", () => {
    render(
      <DocumentCard
        document={mockDoc}
        onView={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    // Date may shift due to timezone; match any Feb 2026 date
    expect(screen.getByText(/Feb.*\d+.*2026/)).toBeInTheDocument();
  });
});
