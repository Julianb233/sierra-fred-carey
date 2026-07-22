/**
 * Tests for in-app notification DB operations (AI-7368)
 *
 * Focus: the idempotency contract of createInAppNotification — the `created`
 * flag that the milestone cron uses to gate SMS sends.
 */
import { describe, it, expect, vi } from "vitest";
import { createInAppNotification } from "../in-app-notifications";

/**
 * Minimal supabase stub: upsert(...).select() resolves to `upsertData`,
 * insert(...).select().single() resolves to `insertData`.
 */
function makeSupabase(opts: {
  upsertData?: unknown[];
  upsertError?: { message: string } | null;
}) {
  const upsert = vi.fn(() => ({
    select: vi.fn(() =>
      Promise.resolve({
        data: opts.upsertData ?? [],
        error: opts.upsertError ?? null,
      })
    ),
  }));
  const insert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(() =>
        Promise.resolve({
          data: {
            id: "new-id",
            user_id: "u1",
            type: "system",
            title: "t",
            body: "b",
            metadata: {},
            created_at: new Date().toISOString(),
          },
          error: null,
        })
      ),
    })),
  }));
  return {
    client: { from: vi.fn(() => ({ upsert, insert })) } as any,
    upsert,
    insert,
  };
}

describe("createInAppNotification", () => {
  it("returns created=true when the dedup upsert inserts a new row", async () => {
    const { client } = makeSupabase({
      upsertData: [
        {
          id: "row-1",
          user_id: "u1",
          type: "milestone_reminder",
          title: "T",
          body: "B",
          dedup_key: "k1",
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ],
    });

    const res = await createInAppNotification(client, {
      userId: "u1",
      type: "milestone_reminder",
      title: "T",
      dedupKey: "k1",
    });

    expect(res.created).toBe(true);
    expect(res.notification?.id).toBe("row-1");
  });

  it("returns created=false when the dedup upsert hits an existing row", async () => {
    // ignoreDuplicates => empty data array when the row already exists.
    const { client } = makeSupabase({ upsertData: [] });

    const res = await createInAppNotification(client, {
      userId: "u1",
      type: "milestone_reminder",
      title: "T",
      dedupKey: "k1",
    });

    expect(res.created).toBe(false);
    expect(res.notification).toBeNull();
  });

  it("uses a plain insert (created=true) when no dedupKey is given", async () => {
    const { client, insert, upsert } = makeSupabase({});

    const res = await createInAppNotification(client, {
      userId: "u1",
      type: "system",
      title: "hello",
    });

    expect(insert).toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(res.created).toBe(true);
    expect(res.notification?.id).toBe("new-id");
  });

  it("throws when the upsert returns an error", async () => {
    const { client } = makeSupabase({
      upsertData: [],
      upsertError: { message: "boom" },
    });

    await expect(
      createInAppNotification(client, {
        userId: "u1",
        type: "milestone_reminder",
        title: "T",
        dedupKey: "k1",
      })
    ).rejects.toThrow(/boom/);
  });
});
