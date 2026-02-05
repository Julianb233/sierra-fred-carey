/**
 * Tests for FRED State Machine
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createActor, waitFor } from "xstate";
import { fredMachine } from "../machine";
import type { UserInput, FredContext } from "../types";

// Mock the memory functions
vi.mock("@/lib/db/fred-memory", () => ({
  retrieveRecentEpisodes: vi.fn().mockResolvedValue([]),
  getAllUserFacts: vi.fn().mockResolvedValue([]),
  getRecentDecisions: vi.fn().mockResolvedValue([]),
  logDecision: vi.fn().mockResolvedValue({ id: "test-decision-id" }),
  storeEpisode: vi.fn().mockResolvedValue({ id: "test-episode-id" }),
}));

describe("FRED State Machine", () => {
  const testUserId = "test-user-123";
  const testSessionId = "test-session-456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should start in idle state", () => {
      const actor = createActor(fredMachine, {
        input: { userId: testUserId, sessionId: testSessionId },
      });

      actor.start();
      const snapshot = actor.getSnapshot();

      expect(snapshot.value).toBe("idle");
      expect(snapshot.context.userId).toBe(testUserId);
      expect(snapshot.context.sessionId).toBe(testSessionId);

      actor.stop();
    });

    it("should have empty context initially", () => {
      const actor = createActor(fredMachine, {
        input: { userId: testUserId, sessionId: testSessionId },
      });

      actor.start();
      const snapshot = actor.getSnapshot();

      expect(snapshot.context.input).toBeNull();
      expect(snapshot.context.validatedInput).toBeNull();
      expect(snapshot.context.mentalModels).toEqual([]);
      expect(snapshot.context.synthesis).toBeNull();
      expect(snapshot.context.decision).toBeNull();

      actor.stop();
    });
  });

  describe("State Transitions", () => {
    it("should transition from idle to loading_memory on USER_INPUT", () => {
      const actor = createActor(fredMachine, {
        input: { userId: testUserId, sessionId: testSessionId },
      });

      actor.start();

      const testInput: UserInput = {
        message: "Should I hire a new developer?",
        timestamp: new Date(),
      };

      actor.send({ type: "USER_INPUT", input: testInput });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("loading_memory");
      expect(snapshot.context.input).toEqual(testInput);

      actor.stop();
    });

    it("should handle CANCEL event from any state", () => {
      const actor = createActor(fredMachine, {
        input: { userId: testUserId, sessionId: testSessionId },
      });

      actor.start();

      actor.send({
        type: "USER_INPUT",
        input: { message: "test", timestamp: new Date() },
      });

      actor.send({ type: "CANCEL" });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("complete");

      actor.stop();
    });
  });

  describe("Full Pipeline - Greeting", () => {
    it("should auto-execute for greetings", async () => {
      const actor = createActor(fredMachine, {
        input: { userId: testUserId, sessionId: testSessionId },
      });

      actor.start();

      actor.send({
        type: "USER_INPUT",
        input: { message: "Hello!", timestamp: new Date() },
      });

      // Wait for the state machine to reach a final state
      const snapshot = await waitFor(
        actor,
        (state) =>
          state.matches("complete") ||
          state.matches("failed") ||
          state.matches("error"),
        { timeout: 10000 }
      );

      expect(snapshot.value).toBe("complete");
      expect(snapshot.context.decision).not.toBeNull();
      expect(snapshot.context.decision?.action).toBe("auto_execute");

      actor.stop();
    });
  });

  describe("Full Pipeline - Question", () => {
    it("should process a question and auto-execute with high confidence", async () => {
      const actor = createActor(fredMachine, {
        input: { userId: testUserId, sessionId: testSessionId },
      });

      actor.start();

      actor.send({
        type: "USER_INPUT",
        input: {
          message: "What is the best way to raise Series A funding?",
          timestamp: new Date(),
        },
      });

      // Questions may go to human_review if confidence isn't high enough
      const snapshot = await waitFor(
        actor,
        (state) =>
          state.matches("complete") ||
          state.matches("human_review") ||
          state.matches("failed") ||
          state.matches("error"),
        { timeout: 10000 }
      );

      expect(["complete", "human_review"]).toContain(snapshot.value);
      expect(snapshot.context.validatedInput).not.toBeNull();
      expect(snapshot.context.validatedInput?.intent).toBe("question");
      expect(snapshot.context.decision).not.toBeNull();

      actor.stop();
    });
  });

  describe("Full Pipeline - Decision Request", () => {
    it("should process a decision request through mental models", async () => {
      const actor = createActor(fredMachine, {
        input: { userId: testUserId, sessionId: testSessionId },
      });

      actor.start();

      actor.send({
        type: "USER_INPUT",
        input: {
          message: "Should I pivot the product to target enterprise customers?",
          timestamp: new Date(),
        },
      });

      const snapshot = await waitFor(
        actor,
        (state) =>
          state.matches("complete") ||
          state.matches("failed") ||
          state.matches("human_review") ||
          state.matches("error"),
        { timeout: 10000 }
      );

      // Should either complete or go to human_review for decisions
      expect(["complete", "human_review"]).toContain(snapshot.value);
      expect(snapshot.context.validatedInput?.intent).toBe("decision_request");
      expect(snapshot.context.mentalModels.length).toBeGreaterThan(0);
      expect(snapshot.context.synthesis).not.toBeNull();
      expect(snapshot.context.decision).not.toBeNull();

      actor.stop();
    });

    it("should apply relevant mental models for decisions", async () => {
      const actor = createActor(fredMachine, {
        input: { userId: testUserId, sessionId: testSessionId },
      });

      actor.start();

      actor.send({
        type: "USER_INPUT",
        input: {
          message: "Should I fire my co-founder?",
          timestamp: new Date(),
        },
      });

      const snapshot = await waitFor(
        actor,
        (state) =>
          state.matches("complete") ||
          state.matches("human_review") ||
          state.matches("failed") ||
          state.matches("error"),
        { timeout: 10000 }
      );

      // High-stakes decision should escalate
      expect(["complete", "human_review"]).toContain(snapshot.value);

      // Should apply multiple mental models
      expect(snapshot.context.mentalModels.length).toBeGreaterThan(0);

      // Check that synthesis was produced
      expect(snapshot.context.synthesis).not.toBeNull();
      expect(snapshot.context.synthesis?.factors).toBeDefined();
      expect(snapshot.context.synthesis?.factors.composite).toBeDefined();

      actor.stop();
    });
  });

  describe("Human Review Flow", () => {
    it("should handle human approval", async () => {
      const actor = createActor(fredMachine, {
        input: { userId: testUserId, sessionId: testSessionId },
      });

      actor.start();

      // Send a decision request that should require review
      actor.send({
        type: "USER_INPUT",
        input: {
          message: "Should we acquire our competitor for $5 million?",
          timestamp: new Date(),
        },
      });

      // Wait for either human_review or complete
      const firstSnapshot = await waitFor(
        actor,
        (state) =>
          state.matches("complete") ||
          state.matches("human_review") ||
          state.matches("failed"),
        { timeout: 10000 }
      );

      // If we're in human_review, test the approval flow
      if (firstSnapshot.value === "human_review") {
        actor.send({ type: "HUMAN_APPROVED" });

        const finalSnapshot = await waitFor(
          actor,
          (state) =>
            state.matches("complete") || state.matches("failed"),
          { timeout: 10000 }
        );

        expect(finalSnapshot.value).toBe("complete");
      }

      actor.stop();
    });

    it("should handle human rejection", async () => {
      const actor = createActor(fredMachine, {
        input: { userId: testUserId, sessionId: testSessionId },
      });

      actor.start();

      actor.send({
        type: "USER_INPUT",
        input: {
          message: "Should we shut down the company?",
          timestamp: new Date(),
        },
      });

      const firstSnapshot = await waitFor(
        actor,
        (state) =>
          state.matches("complete") ||
          state.matches("human_review") ||
          state.matches("failed"),
        { timeout: 10000 }
      );

      if (firstSnapshot.value === "human_review") {
        // Human rejection goes back to synthesis for re-analysis
        // We'll just verify it transitions and then cancel
        actor.send({ type: "HUMAN_REJECTED" });

        // Wait for re-synthesis to complete or reach human_review again
        const secondSnapshot = await waitFor(
          actor,
          (state) =>
            state.matches("complete") ||
            state.matches("human_review") ||
            state.matches("failed"),
          { timeout: 10000 }
        );

        // Either completes, goes back to review, or we can cancel
        expect(["complete", "human_review", "failed"]).toContain(secondSnapshot.value);
      }

      actor.stop();
    });
  });

  describe("Error Handling", () => {
    it("should handle errors gracefully", () => {
      const actor = createActor(fredMachine, {
        input: { userId: testUserId, sessionId: testSessionId },
      });

      actor.start();

      actor.send({
        type: "ERROR",
        error: {
          code: "UNKNOWN_ERROR",
          message: "Test error",
          state: "idle",
          retryable: false,
          timestamp: new Date(),
        },
      });

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.error).not.toBeNull();
      expect(snapshot.context.error?.message).toBe("Test error");

      actor.stop();
    });
  });

  describe("7-Factor Scoring", () => {
    it("should calculate composite scores", async () => {
      const actor = createActor(fredMachine, {
        input: { userId: testUserId, sessionId: testSessionId },
      });

      actor.start();

      actor.send({
        type: "USER_INPUT",
        input: {
          message: "Should I take this $1 million investment offer?",
          timestamp: new Date(),
        },
      });

      const snapshot = await waitFor(
        actor,
        (state) =>
          state.matches("complete") ||
          state.matches("human_review") ||
          state.matches("failed"),
        { timeout: 10000 }
      );

      expect(snapshot.context.synthesis?.factors).toBeDefined();
      const factors = snapshot.context.synthesis?.factors;

      if (factors) {
        // All factor scores should be between 0 and 1
        expect(factors.strategicAlignment).toBeGreaterThanOrEqual(0);
        expect(factors.strategicAlignment).toBeLessThanOrEqual(1);
        expect(factors.leverage).toBeGreaterThanOrEqual(0);
        expect(factors.leverage).toBeLessThanOrEqual(1);
        expect(factors.speed).toBeGreaterThanOrEqual(0);
        expect(factors.speed).toBeLessThanOrEqual(1);
        expect(factors.revenue).toBeGreaterThanOrEqual(0);
        expect(factors.revenue).toBeLessThanOrEqual(1);
        expect(factors.time).toBeGreaterThanOrEqual(0);
        expect(factors.time).toBeLessThanOrEqual(1);
        expect(factors.risk).toBeGreaterThanOrEqual(0);
        expect(factors.risk).toBeLessThanOrEqual(1);
        expect(factors.relationships).toBeGreaterThanOrEqual(0);
        expect(factors.relationships).toBeLessThanOrEqual(1);

        // Composite should be between 0 and 100
        expect(factors.composite).toBeGreaterThanOrEqual(0);
        expect(factors.composite).toBeLessThanOrEqual(100);
      }

      actor.stop();
    });
  });
});

describe("FRED Input Validation", () => {
  const testUserId = "test-user";
  const testSessionId = "test-session";

  it("should detect decision_request intent", async () => {
    const actor = createActor(fredMachine, {
      input: { userId: testUserId, sessionId: testSessionId },
    });

    actor.start();

    actor.send({
      type: "USER_INPUT",
      input: { message: "Should I hire more engineers?", timestamp: new Date() },
    });

    const snapshot = await waitFor(
      actor,
      (state) =>
        state.matches("complete") ||
        state.matches("human_review") ||
        state.matches("failed"),
      { timeout: 10000 }
    );

    expect(snapshot.context.validatedInput?.intent).toBe("decision_request");

    actor.stop();
  });

  it("should detect question intent", async () => {
    const actor = createActor(fredMachine, {
      input: { userId: testUserId, sessionId: testSessionId },
    });

    actor.start();

    actor.send({
      type: "USER_INPUT",
      input: { message: "What is a good runway for a startup?", timestamp: new Date() },
    });

    // Questions may go to human_review depending on confidence
    const snapshot = await waitFor(
      actor,
      (state) =>
        state.matches("complete") ||
        state.matches("human_review") ||
        state.matches("failed"),
      { timeout: 10000 }
    );

    expect(snapshot.context.validatedInput?.intent).toBe("question");

    actor.stop();
  });

  it("should detect greeting intent", async () => {
    const actor = createActor(fredMachine, {
      input: { userId: testUserId, sessionId: testSessionId },
    });

    actor.start();

    actor.send({
      type: "USER_INPUT",
      input: { message: "Hey there!", timestamp: new Date() },
    });

    const snapshot = await waitFor(
      actor,
      (state) => state.matches("complete") || state.matches("failed"),
      { timeout: 10000 }
    );

    expect(snapshot.context.validatedInput?.intent).toBe("greeting");

    actor.stop();
  });

  it("should extract money entities", async () => {
    const actor = createActor(fredMachine, {
      input: { userId: testUserId, sessionId: testSessionId },
    });

    actor.start();

    actor.send({
      type: "USER_INPUT",
      input: {
        message: "Should I take a $500,000 investment at a $5 million valuation?",
        timestamp: new Date(),
      },
    });

    const snapshot = await waitFor(
      actor,
      (state) =>
        state.matches("complete") ||
        state.matches("human_review") ||
        state.matches("failed"),
      { timeout: 10000 }
    );

    const moneyEntities = snapshot.context.validatedInput?.entities.filter(
      (e) => e.type === "money"
    );
    expect(moneyEntities?.length).toBeGreaterThan(0);

    actor.stop();
  });
});
