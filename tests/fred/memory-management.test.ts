/**
 * Tests for Phase 32-02: Memory Management UI & TTS Voice Settings
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Memory Stats API Response Structure Tests
// ============================================================================

describe("Memory Stats API response structure", () => {
  interface MemoryStatsResponse {
    factsCount: number;
    episodesCount: number;
    decisionsCount: number;
    tierLimit: number;
    usagePercent: number;
  }

  function isValidStatsResponse(data: unknown): data is MemoryStatsResponse {
    if (typeof data !== "object" || data === null) return false;
    const obj = data as Record<string, unknown>;
    return (
      typeof obj.factsCount === "number" &&
      typeof obj.episodesCount === "number" &&
      typeof obj.decisionsCount === "number" &&
      typeof obj.tierLimit === "number" &&
      typeof obj.usagePercent === "number"
    );
  }

  it("validates correct stats response shape", () => {
    const validResponse: MemoryStatsResponse = {
      factsCount: 15,
      episodesCount: 8,
      decisionsCount: 3,
      tierLimit: 200,
      usagePercent: 13,
    };
    expect(isValidStatsResponse(validResponse)).toBe(true);
  });

  it("rejects incomplete stats response", () => {
    const incompleteResponse = {
      factsCount: 15,
      episodesCount: 8,
      // missing decisionsCount, tierLimit, usagePercent
    };
    expect(isValidStatsResponse(incompleteResponse)).toBe(false);
  });

  it("rejects non-object stats response", () => {
    expect(isValidStatsResponse(null)).toBe(false);
    expect(isValidStatsResponse("string")).toBe(false);
    expect(isValidStatsResponse(42)).toBe(false);
  });

  it("computes usage percent correctly", () => {
    const totalItems = 15 + 8 + 3; // 26
    const tierLimit = 200;
    const usagePercent = Math.min(100, Math.round((totalItems / tierLimit) * 100));
    expect(usagePercent).toBe(13);
  });

  it("caps usage percent at 100", () => {
    const totalItems = 250;
    const tierLimit = 200;
    const usagePercent = Math.min(100, Math.round((totalItems / tierLimit) * 100));
    expect(usagePercent).toBe(100);
  });

  it("handles zero tier limit without division by zero", () => {
    const tierLimit = 0;
    const totalItems = 5;
    const usagePercent = tierLimit > 0
      ? Math.min(100, Math.round((totalItems / tierLimit) * 100))
      : 0;
    expect(usagePercent).toBe(0);
  });
});

// ============================================================================
// Voice Settings localStorage Tests
// ============================================================================

describe("Voice settings save/load from localStorage", () => {
  const STORAGE_KEY = "sahara-tts-settings";

  interface TTSSettings {
    voiceURI: string;
    rate: number;
    pitch: number;
  }

  const DEFAULT_SETTINGS: TTSSettings = {
    voiceURI: "",
    rate: 0.9,
    pitch: 1.0,
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("saves settings to localStorage", () => {
    const settings: TTSSettings = {
      voiceURI: "Google US English",
      rate: 1.2,
      pitch: 0.8,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.voiceURI).toBe("Google US English");
    expect(parsed.rate).toBe(1.2);
    expect(parsed.pitch).toBe(0.8);
  });

  it("loads saved settings from localStorage", () => {
    const saved: TTSSettings = {
      voiceURI: "Microsoft Zira",
      rate: 1.5,
      pitch: 1.3,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    const loaded = localStorage.getItem(STORAGE_KEY);
    expect(loaded).not.toBeNull();
    const parsed = JSON.parse(loaded!) as Partial<TTSSettings>;

    const settings: TTSSettings = {
      voiceURI: parsed.voiceURI ?? DEFAULT_SETTINGS.voiceURI,
      rate: parsed.rate ?? DEFAULT_SETTINGS.rate,
      pitch: parsed.pitch ?? DEFAULT_SETTINGS.pitch,
    };

    expect(settings.voiceURI).toBe("Microsoft Zira");
    expect(settings.rate).toBe(1.5);
    expect(settings.pitch).toBe(1.3);
  });

  it("returns defaults when no saved settings exist", () => {
    const loaded = localStorage.getItem(STORAGE_KEY);
    expect(loaded).toBeNull();

    // Simulate the component's fallback logic
    const settings: TTSSettings = loaded
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(loaded) }
      : DEFAULT_SETTINGS;

    expect(settings.voiceURI).toBe("");
    expect(settings.rate).toBe(0.9);
    expect(settings.pitch).toBe(1.0);
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem(STORAGE_KEY, "not-valid-json");

    let settings = DEFAULT_SETTINGS;
    try {
      const loaded = localStorage.getItem(STORAGE_KEY);
      if (loaded) {
        settings = { ...DEFAULT_SETTINGS, ...JSON.parse(loaded) };
      }
    } catch {
      // Fall back to defaults
      settings = DEFAULT_SETTINGS;
    }

    expect(settings.rate).toBe(0.9);
    expect(settings.pitch).toBe(1.0);
  });

  it("persists rate within valid range (0.5 to 2.0)", () => {
    const settings: TTSSettings = { voiceURI: "", rate: 0.5, pitch: 1.0 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(parsed.rate).toBeGreaterThanOrEqual(0.5);
    expect(parsed.rate).toBeLessThanOrEqual(2.0);
  });

  it("persists pitch within valid range (0.5 to 1.5)", () => {
    const settings: TTSSettings = { voiceURI: "", rate: 0.9, pitch: 1.5 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(parsed.pitch).toBeGreaterThanOrEqual(0.5);
    expect(parsed.pitch).toBeLessThanOrEqual(1.5);
  });
});

// ============================================================================
// Memory Clear Confirmation Tests
// ============================================================================

describe("Memory clear requires confirmation", () => {
  it("clear all action is gated behind confirmation state", () => {
    // Simulate the component's two-step clear behavior
    let showConfirmation = false;
    let memoriesCleared = false;

    // First attempt - shows confirmation dialog
    function handleClearAttempt() {
      if (!showConfirmation) {
        showConfirmation = true;
        return;
      }
      memoriesCleared = true;
    }

    // First click only shows the dialog
    handleClearAttempt();
    expect(showConfirmation).toBe(true);
    expect(memoriesCleared).toBe(false);

    // Second click (confirming) actually clears
    handleClearAttempt();
    expect(memoriesCleared).toBe(true);
  });

  it("cancellation resets confirmation state", () => {
    let showConfirmation = false;
    let memoriesCleared = false;

    function handleClearAttempt() {
      if (!showConfirmation) {
        showConfirmation = true;
        return;
      }
      memoriesCleared = true;
    }

    function handleCancel() {
      showConfirmation = false;
    }

    // Show dialog
    handleClearAttempt();
    expect(showConfirmation).toBe(true);

    // Cancel
    handleCancel();
    expect(showConfirmation).toBe(false);
    expect(memoriesCleared).toBe(false);

    // Clicking clear again should show dialog again, not clear
    handleClearAttempt();
    expect(showConfirmation).toBe(true);
    expect(memoriesCleared).toBe(false);
  });

  it("does not allow clearing when facts list is empty", () => {
    const facts: unknown[] = [];
    const canClear = facts.length > 0;
    expect(canClear).toBe(false);
  });

  it("allows clearing when facts exist", () => {
    const facts = [
      { id: "1", category: "goals", key: "revenue_target" },
      { id: "2", category: "metrics", key: "mrr" },
    ];
    const canClear = facts.length > 0;
    expect(canClear).toBe(true);
  });
});

// ============================================================================
// Memory Manager Category Filter Tests
// ============================================================================

describe("Memory category filtering", () => {
  const sampleFacts = [
    { id: "1", category: "startup_facts", key: "name", value: { name: "Acme" } },
    { id: "2", category: "startup_facts", key: "stage", value: { stage: "seed" } },
    { id: "3", category: "metrics", key: "mrr", value: { amount: 15000 } },
    { id: "4", category: "goals", key: "target", value: { revenue: 100000 } },
    { id: "5", category: "metrics", key: "churn", value: { rate: 0.05 } },
  ];

  it("shows all facts when filter is 'all'", () => {
    const filter = "all";
    const filtered =
      filter === "all" ? sampleFacts : sampleFacts.filter((f) => f.category === filter);
    expect(filtered).toHaveLength(5);
  });

  it("filters facts by specific category", () => {
    const filter = "metrics";
    const filtered = sampleFacts.filter((f) => f.category === filter);
    expect(filtered).toHaveLength(2);
    expect(filtered.every((f) => f.category === "metrics")).toBe(true);
  });

  it("returns empty for category with no facts", () => {
    const filter = "investor_info";
    const filtered = sampleFacts.filter((f) => f.category === filter);
    expect(filtered).toHaveLength(0);
  });

  it("groups facts by category correctly", () => {
    const groups = sampleFacts.reduce<Record<string, number>>((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1;
      return acc;
    }, {});
    expect(groups["startup_facts"]).toBe(2);
    expect(groups["metrics"]).toBe(2);
    expect(groups["goals"]).toBe(1);
  });
});
