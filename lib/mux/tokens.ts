/**
 * Mux playback token signing
 *
 * signPlaybackToken(playbackId) — generates a short-lived (1h) signed JWT
 * for secure video playback. Requires MUX_SIGNING_KEY_ID and
 * MUX_SIGNING_PRIVATE_KEY environment variables (base64-encoded private key).
 *
 * Do NOT generate tokens without expiration — always use "1h".
 */
import { mux } from "./client";

export async function signPlaybackToken(playbackId: string): Promise<string> {
  return mux.jwt.signPlaybackId(playbackId, {
    expiration: "1h",
    type: "video",
  });
}
