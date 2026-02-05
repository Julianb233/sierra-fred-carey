import { sql } from "@/lib/db/supabase-sql";

/**
 * A/B Test Metrics Collection System
 * Production-grade observability for variant performance tracking
 */

export interface VariantMetrics {
  variantId: string;
  variantName: string;
  experimentName: string;

  // Traffic metrics
  totalRequests: number;
  uniqueUsers: number;
  trafficPercentage: number;

  // Performance metrics
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;

  // Quality metrics
  errorRate: number;
  errorCount: number;
  successRate: number;

  // Conversion metrics (if applicable)
  conversionRate?: number;
  conversions?: number;

  // Statistical significance
  sampleSize: number;
  confidenceLevel?: number;

  // Time range
  startDate: Date;
  endDate: Date;

  // Last updated
  lastRequest?: Date;
}

export interface ExperimentComparison {
  experimentName: string;
  experimentId: string;
  isActive: boolean;
  startDate: Date;
  endDate?: Date;

  variants: VariantMetrics[];

  // Overall experiment metrics
  totalRequests: number;
  totalUsers: number;

  // Winner detection
  hasStatisticalSignificance: boolean;
  winningVariant?: string;
  confidenceLevel?: number;

  // Alerts
  alerts: Alert[];
}

export interface Alert {
  level: "info" | "warning" | "critical";
  type: "performance" | "errors" | "traffic" | "significance";
  message: string;
  variantName?: string;
  metric?: string;
  value?: number;
  threshold?: number;
  timestamp: Date;
}

/**
 * Collect comprehensive metrics for a specific variant
 */
export async function collectVariantMetrics(
  variantId: string,
  startDate?: Date,
  endDate?: Date
): Promise<VariantMetrics | null> {
  const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  try {
    const result = await sql`
      WITH request_stats AS (
        SELECT
          v.id as variant_id,
          v.variant_name,
          e.name as experiment_name,
          v.traffic_percentage,
          COUNT(DISTINCT req.id) as total_requests,
          COUNT(DISTINCT req.user_id) as unique_users,
          AVG(resp.latency_ms) as avg_latency,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY resp.latency_ms) as p50_latency,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY resp.latency_ms) as p95_latency,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY resp.latency_ms) as p99_latency,
          SUM(CASE WHEN resp.error IS NOT NULL THEN 1 ELSE 0 END) as error_count,
          MAX(req.created_at) as last_request
        FROM ab_variants v
        JOIN ab_experiments e ON v.experiment_id = e.id
        LEFT JOIN ai_requests req ON req.variant_id = v.id
          AND req.created_at >= ${start.toISOString()}
          AND req.created_at <= ${end.toISOString()}
        LEFT JOIN ai_responses resp ON resp.request_id = req.id
        WHERE v.id = ${variantId}
        GROUP BY v.id, v.variant_name, e.name, v.traffic_percentage
      )
      SELECT
        variant_id as "variantId",
        variant_name as "variantName",
        experiment_name as "experimentName",
        total_requests as "totalRequests",
        unique_users as "uniqueUsers",
        traffic_percentage as "trafficPercentage",
        COALESCE(avg_latency, 0) as "avgLatencyMs",
        COALESCE(p50_latency, 0) as "p50LatencyMs",
        COALESCE(p95_latency, 0) as "p95LatencyMs",
        COALESCE(p99_latency, 0) as "p99LatencyMs",
        error_count as "errorCount",
        last_request as "lastRequest"
      FROM request_stats
    `;

    if (result.length === 0) {
      return null;
    }

    const data = result[0] as any;
    const totalRequests = parseInt(data.totalRequests, 10) || 0;
    const errorCount = parseInt(data.errorCount, 10) || 0;

    return {
      variantId: data.variantId,
      variantName: data.variantName,
      experimentName: data.experimentName,
      totalRequests,
      uniqueUsers: parseInt(data.uniqueUsers, 10) || 0,
      trafficPercentage: parseFloat(data.trafficPercentage) || 0,
      avgLatencyMs: parseFloat(data.avgLatencyMs) || 0,
      p50LatencyMs: parseFloat(data.p50LatencyMs) || 0,
      p95LatencyMs: parseFloat(data.p95LatencyMs) || 0,
      p99LatencyMs: parseFloat(data.p99LatencyMs) || 0,
      errorRate: totalRequests > 0 ? errorCount / totalRequests : 0,
      errorCount,
      successRate: totalRequests > 0 ? (totalRequests - errorCount) / totalRequests : 0,
      sampleSize: totalRequests,
      startDate: start,
      endDate: end,
      lastRequest: data.lastRequest ? new Date(data.lastRequest) : undefined,
    };
  } catch (error) {
    console.error(`[Monitoring] Error collecting metrics for variant ${variantId}:`, error);
    throw error;
  }
}

/**
 * Compare all variants in an experiment with statistical analysis
 */
export async function compareExperimentVariants(
  experimentName: string,
  startDate?: Date,
  endDate?: Date
): Promise<ExperimentComparison> {
  const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  try {
    const experimentResult = await sql`
      SELECT
        id,
        name,
        is_active as "isActive",
        start_date as "startDate",
        end_date as "endDate"
      FROM ab_experiments
      WHERE name = ${experimentName}
    `;

    if (experimentResult.length === 0) {
      throw new Error(`Experiment not found: ${experimentName}`);
    }

    const experiment = experimentResult[0] as any;

    const variantsResult = await sql`
      SELECT id
      FROM ab_variants
      WHERE experiment_id = ${experiment.id}
    `;

    const variantMetrics = await Promise.all(
      variantsResult.map((v: any) =>
        collectVariantMetrics(v.id, start, end)
      )
    );

    const validMetrics = variantMetrics.filter((m): m is VariantMetrics => m !== null);

    const totalRequests = validMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const totalUsers = validMetrics.reduce((sum, m) => sum + m.uniqueUsers, 0);

    const { hasSignificance, winner, confidence } = detectStatisticalSignificance(validMetrics);

    const alerts = generateAlerts(validMetrics, experiment);

    // Auto-notify for new alerts if enabled
    if (AUTO_NOTIFY_ALERTS && alerts.length > 0) {
      // Import and trigger notifications asynchronously (don't block the response)
      import("./alert-notifier")
        .then(({ notifyAlerts }) => {
          return notifyAlerts(alerts, {
            immediate: true,
            minimumLevel: "warning",
            experimentName: experiment.name,
            experimentId: experiment.id,
          });
        })
        .then((stats) => {
          console.log(
            `[Monitoring] Auto-notified ${stats.notificationsSent} alerts for experiment: ${experiment.name}`
          );
          if (stats.errors.length > 0) {
            console.error(
              `[Monitoring] Notification errors: ${stats.errors.join(", ")}`
            );
          }
        })
        .catch((error) => {
          console.error("[Monitoring] Failed to auto-notify alerts:", error);
        });
    }

    return {
      experimentName: experiment.name,
      experimentId: experiment.id,
      isActive: experiment.isActive,
      startDate: new Date(experiment.startDate),
      endDate: experiment.endDate ? new Date(experiment.endDate) : undefined,
      variants: validMetrics,
      totalRequests,
      totalUsers,
      hasStatisticalSignificance: hasSignificance,
      winningVariant: winner,
      confidenceLevel: confidence,
      alerts,
    };
  } catch (error) {
    console.error(`[Monitoring] Error comparing experiment ${experimentName}:`, error);
    throw error;
  }
}

/**
 * Detect statistical significance using Z-test for proportions
 */
function detectStatisticalSignificance(
  variants: VariantMetrics[]
): { hasSignificance: boolean; winner?: string; confidence?: number } {
  if (variants.length < 2) {
    return { hasSignificance: false };
  }

  const sorted = [...variants].sort((a, b) => b.successRate - a.successRate);
  const best = sorted[0];
  const control = sorted.find(v => v.variantName === "control") || sorted[1];

  const MIN_SAMPLE_SIZE = 100;
  if (best.sampleSize < MIN_SAMPLE_SIZE || control.sampleSize < MIN_SAMPLE_SIZE) {
    return { hasSignificance: false };
  }

  const p1 = best.successRate;
  const p2 = control.successRate;
  const n1 = best.sampleSize;
  const n2 = control.sampleSize;

  const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
  const standardError = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));
  const zScore = Math.abs((p1 - p2) / standardError);

  const CONFIDENCE_THRESHOLD = 1.96;

  if (zScore >= CONFIDENCE_THRESHOLD) {
    const confidence = calculateConfidenceLevel(zScore);
    return {
      hasSignificance: true,
      winner: best.variantName,
      confidence,
    };
  }

  return { hasSignificance: false };
}

function calculateConfidenceLevel(zScore: number): number {
  if (zScore >= 3.29) return 99.9;
  if (zScore >= 2.58) return 99.0;
  if (zScore >= 1.96) return 95.0;
  if (zScore >= 1.645) return 90.0;
  return 0;
}

/**
 * Auto-notify configuration for alert generation
 * Set to true to automatically send notifications when alerts are generated
 */
export const AUTO_NOTIFY_ALERTS = process.env.AUTO_NOTIFY_ALERTS !== "false";

function generateAlerts(
  variants: VariantMetrics[],
  experiment: any
): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();

  const ERROR_RATE_WARNING = 0.05;
  const ERROR_RATE_CRITICAL = 0.10;
  const LATENCY_WARNING_MS = 2000;
  const LATENCY_CRITICAL_MS = 5000;
  const MIN_TRAFFIC_WARNING = 0.10;

  for (const variant of variants) {
    if (variant.errorRate >= ERROR_RATE_CRITICAL) {
      alerts.push({
        level: "critical",
        type: "errors",
        message: `Critical error rate: ${(variant.errorRate * 100).toFixed(2)}%`,
        variantName: variant.variantName,
        metric: "errorRate",
        value: variant.errorRate,
        threshold: ERROR_RATE_CRITICAL,
        timestamp: now,
      });
    } else if (variant.errorRate >= ERROR_RATE_WARNING) {
      alerts.push({
        level: "warning",
        type: "errors",
        message: `Elevated error rate: ${(variant.errorRate * 100).toFixed(2)}%`,
        variantName: variant.variantName,
        metric: "errorRate",
        value: variant.errorRate,
        threshold: ERROR_RATE_WARNING,
        timestamp: now,
      });
    }

    if (variant.p95LatencyMs >= LATENCY_CRITICAL_MS) {
      alerts.push({
        level: "critical",
        type: "performance",
        message: `Critical P95 latency: ${variant.p95LatencyMs.toFixed(0)}ms`,
        variantName: variant.variantName,
        metric: "p95LatencyMs",
        value: variant.p95LatencyMs,
        threshold: LATENCY_CRITICAL_MS,
        timestamp: now,
      });
    } else if (variant.p95LatencyMs >= LATENCY_WARNING_MS) {
      alerts.push({
        level: "warning",
        type: "performance",
        message: `Elevated P95 latency: ${variant.p95LatencyMs.toFixed(0)}ms`,
        variantName: variant.variantName,
        metric: "p95LatencyMs",
        value: variant.p95LatencyMs,
        threshold: LATENCY_WARNING_MS,
        timestamp: now,
      });
    }

    if (experiment.isActive && variant.totalRequests > 0) {
      const expectedTraffic = variant.trafficPercentage / 100;
      const totalRequests = variants.reduce((sum, v) => sum + v.totalRequests, 0);
      const actualTraffic = totalRequests > 0 ? variant.totalRequests / totalRequests : 0;

      if (actualTraffic < expectedTraffic * MIN_TRAFFIC_WARNING) {
        alerts.push({
          level: "warning",
          type: "traffic",
          message: `Low traffic: ${(actualTraffic * 100).toFixed(1)}% (expected ${(expectedTraffic * 100).toFixed(0)}%)`,
          variantName: variant.variantName,
          metric: "trafficPercentage",
          value: actualTraffic,
          threshold: expectedTraffic * MIN_TRAFFIC_WARNING,
          timestamp: now,
        });
      }
    }

    const MIN_SAMPLE_FOR_ANALYSIS = 100;
    if (variant.sampleSize < MIN_SAMPLE_FOR_ANALYSIS && variant.totalRequests > 0) {
      alerts.push({
        level: "info",
        type: "significance",
        message: `Insufficient sample size: ${variant.sampleSize} (need ${MIN_SAMPLE_FOR_ANALYSIS})`,
        variantName: variant.variantName,
        metric: "sampleSize",
        value: variant.sampleSize,
        threshold: MIN_SAMPLE_FOR_ANALYSIS,
        timestamp: now,
      });
    }
  }

  return alerts;
}

export async function getMonitoringDashboard(): Promise<{
  activeExperiments: ExperimentComparison[];
  totalActiveTests: number;
  totalRequests24h: number;
  criticalAlerts: Alert[];
}> {
  try {
    const experimentsResult = await sql`
      SELECT name
      FROM ab_experiments
      WHERE is_active = true
        AND (end_date IS NULL OR end_date > NOW())
      ORDER BY start_date DESC
    `;

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const experiments = await Promise.all(
      experimentsResult.map((exp: any) =>
        compareExperimentVariants(exp.name, yesterday, now)
      )
    );

    const totalRequests24h = experiments.reduce((sum, exp) => sum + exp.totalRequests, 0);

    const criticalAlerts = experiments
      .flatMap(exp => exp.alerts)
      .filter(alert => alert.level === "critical")
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      activeExperiments: experiments,
      totalActiveTests: experiments.length,
      totalRequests24h,
      criticalAlerts,
    };
  } catch (error) {
    console.error("[Monitoring] Error getting dashboard data:", error);
    throw error;
  }
}

export async function logVariantAssignment(
  userId: string,
  variantId: string,
  experimentName: string,
  sessionId?: string
): Promise<void> {
  console.log(`[Monitoring] Variant assignment: user=${userId}, variant=${variantId}, experiment=${experimentName}, session=${sessionId}`);
}
