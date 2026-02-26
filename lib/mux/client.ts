/**
 * Mux client singleton
 *
 * Initialized from environment variables:
 *   MUX_TOKEN_ID       — Mux API access token ID
 *   MUX_TOKEN_SECRET   — Mux API access token secret
 *   MUX_WEBHOOK_SECRET — Mux webhook signature verification (optional, used in webhook handler)
 */
import Mux from "@mux/mux-node";

if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
  // In build/test environments, allow missing credentials (routes will fail at runtime)
  console.warn("[mux] MUX_TOKEN_ID or MUX_TOKEN_SECRET not set");
}

export const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID ?? "",
  tokenSecret: process.env.MUX_TOKEN_SECRET ?? "",
  webhookSecret: process.env.MUX_WEBHOOK_SECRET,
});
