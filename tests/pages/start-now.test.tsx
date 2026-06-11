import { describe, it, expect, vi } from "vitest";

const redirectMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("Start Now Page (/start-now)", () => {
  it("redirects to the existing onboarding flow", async () => {
    const module = await import("@/app/start-now/page");

    module.default();

    expect(redirectMock).toHaveBeenCalledWith("/get-started");
  });
});
