/**
 * Next Steps Hub Page Tests
 * Tests for /dashboard/next-steps
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import NextStepsPage from "@/app/dashboard/next-steps/page";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockSteps = {
  success: true,
  data: {
    critical: [
      {
        id: "step-1",
        userId: "user-1",
        description: "Validate your core assumption",
        whyItMatters: "Without validation, you risk building the wrong thing",
        priority: "critical",
        sourceConversationDate: "2026-02-10T10:00:00Z",
        completed: false,
        completedAt: null,
        dismissed: false,
        createdAt: "2026-02-10T10:00:00Z",
        updatedAt: "2026-02-10T10:00:00Z",
      },
    ],
    important: [
      {
        id: "step-2",
        userId: "user-1",
        description: "Set up user analytics",
        whyItMatters: null,
        priority: "important",
        sourceConversationDate: null,
        completed: false,
        completedAt: null,
        dismissed: false,
        createdAt: "2026-02-10T10:00:00Z",
        updatedAt: "2026-02-10T10:00:00Z",
      },
    ],
    optional: [],
  },
};

const emptySteps = {
  success: true,
  data: { critical: [], important: [], optional: [] },
};

describe("Next Steps Hub (/dashboard/next-steps)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders loading state initially", async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves
    let container: HTMLElement;
    await act(async () => {
      const result = render(<NextStepsPage />);
      container = result.container;
    });
    // Loading spinner should be present
    const spinner = container!.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders steps grouped by priority", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => mockSteps,
    });

    await act(async () => {
      render(<NextStepsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Validate your core assumption")).toBeInTheDocument();
    });

    expect(screen.getByText("Set up user analytics")).toBeInTheDocument();
    expect(screen.getAllByText(/Critical/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Important/).length).toBeGreaterThan(0);
  });

  it("renders empty state when no steps exist", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => emptySteps,
    });

    await act(async () => {
      render(<NextStepsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("No Next Steps Yet")).toBeInTheDocument();
    });

    expect(screen.getByText("Start a Conversation")).toBeInTheDocument();
  });

  it("renders per-tier empty messages", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => emptySteps,
    });

    await act(async () => {
      render(<NextStepsPage />);
    });

    await waitFor(() => {
      expect(
        screen.getByText("No critical actions right now. You're in good shape!")
      ).toBeInTheDocument();
    });

    expect(screen.getByText("No important actions pending.")).toBeInTheDocument();
    expect(screen.getByText("No optional items at the moment.")).toBeInTheDocument();
  });

  it("renders header with Refresh and Chat buttons", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => mockSteps,
    });

    await act(async () => {
      render(<NextStepsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Next Steps")).toBeInTheDocument();
    });

    expect(screen.getByText("Refresh")).toBeInTheDocument();
    expect(screen.getByText("Chat with FRED")).toBeInTheDocument();
  });

  it("renders error state on fetch failure", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: false, error: "Server error" }),
    });

    await act(async () => {
      render(<NextStepsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("No Next Steps Yet")).toBeInTheDocument();
      expect(screen.getByText("Start a Conversation")).toBeInTheDocument();
    });
  });

  it("calls POST on Refresh button click", async () => {
    mockFetch
      .mockResolvedValueOnce({ json: async () => mockSteps }) // initial GET
      .mockResolvedValueOnce({ json: async () => mockSteps }); // POST refresh

    await act(async () => {
      render(<NextStepsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Refresh"));
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/dashboard/next-steps",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
