/**
 * FRED Observability
 *
 * Provides logging, metrics, and tracing for FRED's cognitive pipeline.
 */

import type { FredContext, FredResponse, FredEvent } from "./types";
import { logger } from "@/lib/logger";

export interface StateTransition {
  from: string;
  to: string;
  event: string;
  timestamp: Date;
  duration: number;
}

export interface FredMetrics {
  sessionId: string;
  totalProcessingTime: number;
  stateTransitions: StateTransition[];
  mentalModelsApplied: number;
  confidence: number;
  action: string;
  errors: Array<{ message: string; timestamp: Date }>;
}

/**
 * FRED Observability class for monitoring and logging
 */
export class FredObservability {
  private sessionId: string;
  private startTime: Date | null = null;
  private transitions: StateTransition[] = [];
  private errors: Array<{ message: string; timestamp: Date }> = [];
  private lastState: string = "idle";
  private lastStateTime: Date = new Date();
  private finalMetrics: FredMetrics | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Attach observability to an XState actor
   */
  attachToActor(actor: any): void {
    this.startTime = new Date();
    this.lastStateTime = new Date();

    actor.subscribe((snapshot: any) => {
      const currentState = typeof snapshot.value === "string"
        ? snapshot.value
        : JSON.stringify(snapshot.value);

      if (currentState !== this.lastState) {
        this.logTransition(this.lastState, currentState, snapshot.context);
        this.lastState = currentState;
      }

      // Check for errors in context
      if (snapshot.context.error && !this.errors.some(
        (e) => e.message === snapshot.context.error?.message
      )) {
        this.logError(new Error(snapshot.context.error.message), 0);
      }
    });
  }

  /**
   * Log a state transition
   */
  private logTransition(
    from: string,
    to: string,
    context: FredContext
  ): void {
    const now = new Date();
    const duration = now.getTime() - this.lastStateTime.getTime();

    const transition: StateTransition = {
      from,
      to,
      event: this.inferEvent(from, to),
      timestamp: now,
      duration,
    };

    this.transitions.push(transition);
    this.lastStateTime = now;

    // Console log for development
    logger.log(
      `[FRED] ${from} → ${to} (${duration}ms)`,
      context.error ? `[ERROR: ${context.error.message}]` : ""
    );

    // In production, this would send to a logging service
    this.emitMetric("state_transition", {
      sessionId: this.sessionId,
      ...transition,
    });
  }

  /**
   * Infer the event type from state transition
   */
  private inferEvent(from: string, to: string): string {
    const eventMap: Record<string, string> = {
      "idle->loading_memory": "USER_INPUT",
      "loading_memory->intake": "MEMORY_LOADED",
      "intake->validation": "INPUT_RECEIVED",
      "validation->mental_models": "INPUT_VALIDATED",
      "validation->clarification": "CLARIFICATION_NEEDED",
      "clarification->validation": "CLARIFICATION_RECEIVED",
      "mental_models->synthesis": "MODELS_APPLIED",
      "synthesis->decide": "SYNTHESIS_COMPLETE",
      "decide->execute": "AUTO_EXECUTE",
      "decide->human_review": "NEEDS_APPROVAL",
      "human_review->execute": "HUMAN_APPROVED",
      "human_review->complete": "HUMAN_REJECTED",
      "execute->complete": "EXECUTE_SUCCESS",
    };

    return eventMap[`${from}->${to}`] || "UNKNOWN";
  }

  /**
   * Log an error
   */
  logError(error: Error, duration: number): void {
    this.errors.push({
      message: error.message,
      timestamp: new Date(),
    });

    console.error(`[FRED] Error:`, error.message);

    this.emitMetric("error", {
      sessionId: this.sessionId,
      error: error.message,
      duration,
    });
  }

  /**
   * Log completion
   */
  logCompletion(response: FredResponse, duration: number): void {
    const metrics = this.buildMetrics(response, duration);
    this.finalMetrics = metrics;

    logger.log(
      `[FRED] Complete | Action: ${response.action} | Confidence: ${Math.round(response.confidence * 100)}% | Duration: ${duration}ms`
    );

    this.emitMetric("completion", metrics as unknown as Record<string, unknown>);
  }

  /**
   * Build final metrics
   */
  private buildMetrics(response: FredResponse, duration: number): FredMetrics {
    return {
      sessionId: this.sessionId,
      totalProcessingTime: duration,
      stateTransitions: this.transitions,
      mentalModelsApplied: this.countMentalModels(),
      confidence: response.confidence,
      action: response.action,
      errors: this.errors,
    };
  }

  /**
   * Count mental models from transitions
   */
  private countMentalModels(): number {
    // Estimate based on whether we went through mental_models state
    const wentThroughModels = this.transitions.some(
      (t) => t.from === "mental_models" || t.to === "mental_models"
    );
    return wentThroughModels ? 4 : 0; // Default to 4 models if used
  }

  /**
   * Emit a metric (placeholder for actual metrics service)
   */
  private emitMetric(name: string, data: Record<string, unknown>): void {
    // In production, this would send to DataDog, CloudWatch, etc.
    // For now, we'll just structure the data for future use
    const metric = {
      name: `fred.${name}`,
      timestamp: new Date().toISOString(),
      ...data,
    };

    // Could be sent to a metrics service here
    // metricsService.emit(metric);

    // For development, we can optionally log structured metrics
    if (process.env.FRED_DEBUG_METRICS === "true") {
      logger.log("[FRED Metric]", JSON.stringify(metric));
    }
  }

  /**
   * Get collected metrics
   */
  getMetrics(): FredMetrics | null {
    return this.finalMetrics;
  }

  /**
   * Get transitions
   */
  getTransitions(): StateTransition[] {
    return [...this.transitions];
  }

  /**
   * Get errors
   */
  getErrors(): Array<{ message: string; timestamp: Date }> {
    return [...this.errors];
  }

  /**
   * Reset for new session
   */
  reset(): void {
    this.startTime = null;
    this.transitions = [];
    this.errors = [];
    this.lastState = "idle";
    this.lastStateTime = new Date();
    this.finalMetrics = null;
  }
}

/**
 * Create a trace ID for distributed tracing
 */
export function createTraceId(): string {
  return `fred-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Structured logger for FRED
 */
export const fredLogger = {
  debug: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === "development" || process.env.FRED_DEBUG === "true") {
      logger.log(`[FRED:DEBUG] ${message}`, data || "");
    }
  },

  info: (message: string, data?: Record<string, unknown>) => {
    logger.log(`[FRED:INFO] ${message}`, data || "");
  },

  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(`[FRED:WARN] ${message}`, data || "");
  },

  error: (message: string, error?: Error, data?: Record<string, unknown>) => {
    console.error(`[FRED:ERROR] ${message}`, error?.message || "", data || "");
  },

  metric: (name: string, value: number, tags?: Record<string, string>) => {
    // Structured metric logging
    const metric = {
      name: `fred.${name}`,
      value,
      timestamp: new Date().toISOString(),
      tags,
    };

    if (process.env.FRED_DEBUG_METRICS === "true") {
      logger.log("[FRED:METRIC]", JSON.stringify(metric));
    }
  },
};
