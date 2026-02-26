/**
 * Mux upload helpers
 *
 * createDirectUpload(lessonId, corsOrigin) — creates a Mux direct upload URL.
 *   - playback_policies set to "signed" for tier-gated content
 *   - passthrough set to lessonId so webhook can link asset back to lesson
 *
 * getAsset(assetId) — fetches Mux asset details.
 */
import { mux } from "./client";

export interface DirectUploadResult {
  uploadId: string;
  uploadUrl: string;
}

export async function createDirectUpload(
  lessonId: string,
  corsOrigin: string
): Promise<DirectUploadResult> {
  const upload = await mux.video.uploads.create({
    cors_origin: corsOrigin,
    new_asset_settings: {
      playback_policies: ["signed"], // NEVER "public" for gated content
      passthrough: lessonId, // Links Mux asset back to lesson row in DB
    },
  });

  return {
    uploadId: upload.id,
    uploadUrl: upload.url,
  };
}

export async function getAsset(assetId: string) {
  return mux.video.assets.retrieve(assetId);
}
