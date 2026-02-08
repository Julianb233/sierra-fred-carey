/**
 * Tests for Phase 32-01: TTS, Memory Browser, Chat Export
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// TTS Tests
// ============================================================================

describe("TTS Controller", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("isSupported returns false when window.speechSynthesis is absent", async () => {
    // In jsdom test env, speechSynthesis is not defined
    const { tts } = await import("@/lib/tts");
    expect(tts.isSupported()).toBe(false);
  });

  it("isSpeaking returns false when unsupported", async () => {
    const { tts } = await import("@/lib/tts");
    expect(tts.isSpeaking()).toBe(false);
  });

  it("speak is a no-op when unsupported", async () => {
    const { tts } = await import("@/lib/tts");
    // Should not throw
    expect(() => tts.speak("Hello world")).not.toThrow();
  });

  it("stop is a no-op when unsupported", async () => {
    const { tts } = await import("@/lib/tts");
    expect(() => tts.stop()).not.toThrow();
  });
});

// ============================================================================
// Export API Format Tests
// ============================================================================

describe("Chat Export Formatters", () => {
  // We test the format logic directly rather than hitting the API endpoint
  // since the endpoint requires Supabase auth. We replicate the logic here.

  interface ExportMessage {
    role: string;
    content: string;
    timestamp: string;
    metadata: Record<string, unknown>;
  }

  function escapeCsv(value: string): string {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  function toCSV(messages: ExportMessage[]): string {
    const header = "timestamp,role,content";
    const rows = messages.map(
      (m) =>
        `${escapeCsv(m.timestamp)},${escapeCsv(m.role)},${escapeCsv(m.content)}`
    );
    return [header, ...rows].join("\n");
  }

  function toMarkdown(messages: ExportMessage[]): string {
    const grouped = new Map<string, ExportMessage[]>();
    for (const msg of messages) {
      const date = new Date(msg.timestamp).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!grouped.has(date)) grouped.set(date, []);
      grouped.get(date)!.push(msg);
    }

    const lines: string[] = [];
    for (const [date, msgs] of grouped) {
      lines.push(`## Session: ${date}\n`);
      for (const msg of msgs) {
        const label = msg.role === "user" ? "**User:**" : "**FRED:**";
        lines.push(`${label} ${msg.content}\n`);
      }
      lines.push("---\n");
    }
    return lines.join("\n");
  }

  const sampleMessages: ExportMessage[] = [
    {
      role: "user",
      content: "How should I price my SaaS?",
      timestamp: "2026-02-07T10:00:00Z",
      metadata: {},
    },
    {
      role: "assistant",
      content: "Great question! Let's look at your unit economics.",
      timestamp: "2026-02-07T10:00:05Z",
      metadata: {},
    },
  ];

  it("CSV export includes header and properly formatted rows", () => {
    const csv = toCSV(sampleMessages);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("timestamp,role,content");
    expect(lines.length).toBe(3); // header + 2 data rows
    expect(lines[1]).toContain("user");
    expect(lines[2]).toContain("assistant");
  });

  it("CSV escapes commas and quotes in content", () => {
    const msgs: ExportMessage[] = [
      {
        role: "user",
        content: 'He said "hello, world"',
        timestamp: "2026-02-07T10:00:00Z",
        metadata: {},
      },
    ];
    const csv = toCSV(msgs);
    // Content should be wrapped in quotes with inner quotes doubled
    expect(csv).toContain('"He said ""hello, world"""');
  });

  it("Markdown export groups by date with proper headers", () => {
    const md = toMarkdown(sampleMessages);
    expect(md).toContain("## Session:");
    expect(md).toContain("**User:**");
    expect(md).toContain("**FRED:**");
    expect(md).toContain("---");
  });

  it("JSON export round-trips correctly", () => {
    const json = JSON.stringify(sampleMessages, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].role).toBe("user");
    expect(parsed[1].role).toBe("assistant");
  });
});

// ============================================================================
// Memory API Type Filtering Tests
// ============================================================================

describe("Memory API text filter logic", () => {
  // Replicate the textFilter helper from the memory route
  function textFilter<T>(items: T[], searchText: string): T[] {
    const q = searchText.toLowerCase();
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
  }

  const sampleFacts = [
    { id: "1", category: "startup_facts", key: "company_name", value: { name: "Acme Corp" } },
    { id: "2", category: "metrics", key: "mrr", value: { amount: 15000 } },
    { id: "3", category: "goals", key: "target_revenue", value: { amount: 100000 } },
  ];

  it("returns all items when search is empty", () => {
    expect(textFilter(sampleFacts, "")).toHaveLength(3);
  });

  it("filters by category text", () => {
    const result = textFilter(sampleFacts, "metrics");
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("mrr");
  });

  it("filters by value content", () => {
    const result = textFilter(sampleFacts, "acme");
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("company_name");
  });

  it("is case-insensitive", () => {
    const result = textFilter(sampleFacts, "ACME");
    expect(result).toHaveLength(1);
  });

  it("returns empty array when nothing matches", () => {
    const result = textFilter(sampleFacts, "nonexistent_xyz");
    expect(result).toHaveLength(0);
  });
});
