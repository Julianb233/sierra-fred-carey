import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:3001",
]);

// Webhook origins that bypass CORS (they use signature verification instead)
const WEBHOOK_PATHS = new Set([
  "/api/stripe/webhook",
  "/api/sms/webhook",
  "/api/boardy/callback",
]);

/**
 * Get CORS headers for a given origin
 */
export function corsHeaders(
  origin?: string | null
): Record<string, string> {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Add CORS headers to an existing NextResponse
 */
export function withCorsHeaders(
  response: NextResponse,
  origin?: string | null
): NextResponse {
  const headers = corsHeaders(origin);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCorsOptions(request: NextRequest): NextResponse {
  const origin = request.headers.get("origin");
  const response = new NextResponse(null, { status: 204 });
  return withCorsHeaders(response, origin);
}

/**
 * Check if a path is a webhook endpoint (skips CORS)
 */
export function isWebhookPath(pathname: string): boolean {
  return WEBHOOK_PATHS.has(pathname);
}
