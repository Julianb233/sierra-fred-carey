/**
 * Readiness Tab Page Tests
 * Tests for /dashboard/readiness
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import ReadinessPage from "@/app/dashboard/readiness/page";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock useUserTier to return Pro tier by default
const mockUseUserTier = vi.fn();
vi.mock("@/lib/context/tier-context", () => ({
  useUserTier: () => mockUseUserTier(),
  useTier: () => ({ tier: 1, isLoading: false }),
}));

const mockReadinessData = {
  success: true,
  data: {
    investorReadiness: {
      score: 65,
      zone: "yellow" as const,
      categories: [
        { name: "Team", score: 70, benchmark: 60 },
        { name: "Market", score: 55, benchmark: 65 },
        { name: "Product", score: 75, benchmark: 60 },
      ],
      strengths: ["Strong technical team", "Clear product vision"],
      weaknesses: ["Limited traction data", "No revenue yet"],
      trend: [
        { score: 45, date: "2026-01-15T00:00:00Z" },
        { score: 55, date: "2026-01-22T00:00:00Z" },
        { score: 65, date: "2026-02-01T00:00:00Z" },
      ],
    },
    positioningReadiness: {
      grade: "B",
      narrativeTightness: 7,
      categories: [
        { name: "Clarity", grade: "A", score: 85 },
        { name: "Differentiation", grade: "B", score: 72 },
        { name: "Market Understanding", grade: "C", score: 58 },
        { name: "Narrative Strength", grade: "B", score: 70 },
      ],
      gaps: ["Market sizing needs more data", "Competitor analysis incomplete"],
      nextActions: ["Research TAM/SAM/SOM", "Map competitor landscape"],
    },
    hasIRS: true,
    hasPositioning: true,
  },
};

const emptyReadinessData = {
  success: true,
  data: {
    investorReadiness: null,
    positioningReadiness: null,
    hasIRS: false,
    hasPositioning: false,
  },
};

describe("Readiness Tab (/dashboard/readiness)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    // Default: Pro tier, loaded
    mockUseUserTier.mockReturnValue({
      tier: 1,
      isLoading: false,
      tierName: "Pro",
      isSubscriptionActive: true,
      features: [],
      canAccess: () => true,
    });
  });

  it("renders loading state while tier is loading", async () => {
    mockUseUserTier.mockReturnValue({
      tier: 0,
      isLoading: true,
      tierName: "Free",
      isSubscriptionActive: false,
      features: [],
      canAccess: () => false,
    });

    let container: HTMLElement;
    await act(async () => {
      const result = render(<ReadinessPage />);
      container = result.container;
    });

    const spinner = container!.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("shows FeatureLock for Free tier users", async () => {
    mockUseUserTier.mockReturnValue({
      tier: 0,
      isLoading: false,
      tierName: "Free",
      isSubscriptionActive: false,
      features: [],
      canAccess: () => false,
    });

    await act(async () => {
      render(<ReadinessPage />);
    });

    expect(screen.getByText("Readiness Dashboard")).toBeInTheDocument();
  });

  it("renders both sections with data for Pro users", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockReadinessData });

    await act(async () => {
      render(<ReadinessPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Investor Readiness")).toBeInTheDocument();
    });

    expect(screen.getByText("Positioning Readiness")).toBeInTheDocument();
  });

  it("renders empty states when no assessments exist", async () => {
    mockFetch.mockResolvedValue({ json: async () => emptyReadinessData });

    await act(async () => {
      render(<ReadinessPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("No investor readiness score yet")).toBeInTheDocument();
    });

    expect(screen.getByText("No positioning assessment yet")).toBeInTheDocument();
  });

  it("renders error state on fetch failure", async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({ success: false, error: "Server error" }),
    });

    await act(async () => {
      render(<ReadinessPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("renders IRS categories and scores", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockReadinessData });

    await act(async () => {
      render(<ReadinessPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Team")).toBeInTheDocument();
    });

    expect(screen.getByText("Market")).toBeInTheDocument();
    expect(screen.getByText("Product")).toBeInTheDocument();
  });

  it("renders strengths and weaknesses", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockReadinessData });

    await act(async () => {
      render(<ReadinessPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Strong technical team")).toBeInTheDocument();
    });

    expect(screen.getByText("Limited traction data")).toBeInTheDocument();
  });

  it("renders positioning gaps", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockReadinessData });

    await act(async () => {
      render(<ReadinessPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Market sizing needs more data")).toBeInTheDocument();
    });
  });

  it("renders reassess buttons", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockReadinessData });

    await act(async () => {
      render(<ReadinessPage />);
    });

    await waitFor(() => {
      const reassessButtons = screen.getAllByText("Reassess");
      expect(reassessButtons.length).toBe(2);
    });
  });
});
