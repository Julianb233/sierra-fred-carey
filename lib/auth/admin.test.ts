// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminSession } from "@/lib/auth/admin-sessions";
import { isAdminRequest, requireAdminRequest } from "@/lib/auth/admin";

const url = "https://sahara.example/api/admin/ai-costs";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin request authentication", () => {
  it("fails closed when ADMIN_SECRET_KEY is missing", async () => {
    vi.stubEnv("ADMIN_SECRET_KEY", "");
    const request = new NextRequest(url);

    await expect(isAdminRequest(request)).resolves.toBe(false);
    const denied = await requireAdminRequest(request);
    expect(denied?.status).toBe(401);
  });

  it("rejects a missing or incorrect admin key", async () => {
    vi.stubEnv("ADMIN_SECRET_KEY", "correct-admin-secret");

    await expect(isAdminRequest(new NextRequest(url))).resolves.toBe(false);
    await expect(
      isAdminRequest(
        new NextRequest(url, {
          headers: { "x-admin-key": "incorrect-admin-secret" },
        })
      )
    ).resolves.toBe(false);
  });

  it("accepts the exact admin key", async () => {
    vi.stubEnv("ADMIN_SECRET_KEY", "correct-admin-secret");
    const request = new NextRequest(url, {
      headers: { "x-admin-key": "correct-admin-secret" },
    });

    await expect(isAdminRequest(request)).resolves.toBe(true);
  });

  it("accepts a valid signed admin session cookie", async () => {
    vi.stubEnv("ADMIN_SECRET_KEY", "correct-admin-secret");
    const token = await createAdminSession();
    const request = new NextRequest(url, {
      headers: { cookie: `adminSession=${token}` },
    });

    await expect(isAdminRequest(request)).resolves.toBe(true);
  });
});
