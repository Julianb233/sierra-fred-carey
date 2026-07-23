/**
 * Get Started Page Tests
 * /get-started is now a compatibility redirect into capture-first signup.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";
import GetStartedRedirect from "@/app/get-started/page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

describe("Get Started Page (/get-started)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /start-now and tags source", async () => {
    await expect(
      GetStartedRedirect({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow("redirect:/start-now?source=get-started");

    expect(redirect).toHaveBeenCalledWith("/start-now?source=get-started");
  });

  it("preserves existing query params", async () => {
    await expect(
      GetStartedRedirect({
        searchParams: Promise.resolve({
          ref: "founder-123",
          utm_campaign: "july-launch",
        }),
      })
    ).rejects.toThrow(
      "redirect:/start-now?ref=founder-123&utm_campaign=july-launch&source=get-started"
    );
  });

  it("does not overwrite explicit source params", async () => {
    await expect(
      GetStartedRedirect({
        searchParams: Promise.resolve({ source: "partner", ref: "abc" }),
      })
    ).rejects.toThrow("redirect:/start-now?source=partner&ref=abc");
  });
});
