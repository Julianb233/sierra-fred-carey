/**
 * Fred AI Health Check Endpoint
 *
 * GET /api/fred/health
 * Returns the health status of Fred's AI providers.
 * No auth required — used by client-side to detect outages.
 */

import { NextResponse } from "next/server";
import { hasAnyProvider, getAvailableProviders } from "@/lib/ai/providers";
import { circuitBreaker } from "@/lib/ai/circuit-breaker";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const available = getAvailableProviders();
    const hasProviders = hasAnyProvider();
    const circuits = circuitBreaker.getMetrics();

    // Check if any provider has an open circuit (actively failing)
    const openCircuits = circuits.filter((c) => c.state === "open");
    const allCircuitsOpen =
      circuits.length > 0 && openCircuits.length === circuits.length;

    let status: "ok" | "degraded" | "down";
    if (!hasProviders) {
      status = "down";
    } else if (allCircuitsOpen) {
      status = "down";
    } else if (openCircuits.length > 0) {
      status = "degraded";
    } else {
      status = "ok";
    }

    return NextResponse.json({
      status,
      providers: available.length,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "down", providers: 0, timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
