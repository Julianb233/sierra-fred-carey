/**
 * Sharing Infrastructure - Shareable Links
 * Phase 33-01: Collaboration & Sharing
 *
 * Provides CRUD operations for shareable links and resource access.
 * Uses createServiceClient for public token validation (anonymous access),
 * createClient for user-scoped operations.
 */

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface ShareLink {
  id: string;
  user_id: string;
  resource_type: ShareableResourceType;
  resource_id: string;
  token: string;
  access_level: "view" | "comment";
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShareLinkOptions {
  /** Access level for the shared link */
  accessLevel?: "view" | "comment";
  /** Expiry duration in hours (e.g. 24, 168, 720). Null = never expires */
  expiresInHours?: number | null;
  /** Maximum number of views. Null = unlimited */
  maxViews?: number | null;
}

export interface SharedResource {
  link: ShareLink;
  resource: Record<string, unknown>;
  resourceType: ShareableResourceType;
}

export type ShareableResourceType =
  | "strategy_document"
  | "pitch_review"
  | "investor_readiness"
  | "red_flags_report";

const VALID_RESOURCE_TYPES: ShareableResourceType[] = [
  "strategy_document",
  "pitch_review",
  "investor_readiness",
  "red_flags_report",
];

/**
 * Maps resource types to their database table names and user_id column names.
 */
const RESOURCE_TABLE_MAP: Record<
  ShareableResourceType,
  { table: string; userIdColumn: string }
> = {
  strategy_document: { table: "strategy_documents", userIdColumn: "user_id" },
  pitch_review: { table: "pitch_reviews", userIdColumn: "user_id" },
  investor_readiness: {
    table: "investor_readiness_scores",
    userIdColumn: "user_id",
  },
  red_flags_report: { table: "fred_red_flags", userIdColumn: "user_id" },
};

const log = logger.child({ module: "sharing" });

// ============================================================================
// Validation
// ============================================================================

export function isValidResourceType(
  type: string
): type is ShareableResourceType {
  return VALID_RESOURCE_TYPES.includes(type as ShareableResourceType);
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Create a shareable link for a resource.
 * Uses the user-scoped client (RLS ensures ownership).
 */
export async function createShareLink(
  userId: string,
  resourceType: ShareableResourceType,
  resourceId: string,
  options: ShareLinkOptions = {}
): Promise<ShareLink> {
  const supabase = await createClient();

  // Verify the user owns the resource
  const { table, userIdColumn } = RESOURCE_TABLE_MAP[resourceType];
  const { data: resource, error: resourceError } = await supabase
    .from(table)
    .select("id")
    .eq("id", resourceId)
    .eq(userIdColumn, userId)
    .single();

  if (resourceError || !resource) {
    throw new Error(
      `Resource not found or not owned by user: ${resourceType}/${resourceId}`
    );
  }

  const expiresAt = options.expiresInHours
    ? new Date(
        Date.now() + options.expiresInHours * 60 * 60 * 1000
      ).toISOString()
    : null;

  const { data, error } = await supabase
    .from("shared_links")
    .insert({
      user_id: userId,
      resource_type: resourceType,
      resource_id: resourceId,
      access_level: options.accessLevel || "view",
      expires_at: expiresAt,
      max_views: options.maxViews ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    log.error("Failed to create share link", { error, userId, resourceType });
    throw new Error("Failed to create share link");
  }

  log.info("Share link created", {
    linkId: data.id,
    resourceType,
    userId,
  });

  return data as ShareLink;
}

/**
 * Get a share link by token. Validates expiry, active status, and max views.
 * Increments view_count on successful validation.
 * Uses service client for anonymous/public access.
 */
export async function getShareLink(
  token: string
): Promise<ShareLink | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("shared_links")
    .select("*")
    .eq("token", token)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  const link = data as ShareLink;

  // Check expiry
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    log.info("Share link expired", { linkId: link.id, token });
    return null;
  }

  // Check max views
  if (link.max_views !== null && link.view_count >= link.max_views) {
    log.info("Share link max views reached", { linkId: link.id, token });
    return null;
  }

  // Increment view count
  await supabase
    .from("shared_links")
    .update({
      view_count: link.view_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", link.id);

  return { ...link, view_count: link.view_count + 1 };
}

/**
 * Revoke a share link. Sets is_active to false.
 * Uses user-scoped client (RLS ensures ownership).
 */
export async function revokeShareLink(
  userId: string,
  linkId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("shared_links")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", linkId)
    .eq("user_id", userId);

  if (error) {
    log.error("Failed to revoke share link", { error, linkId, userId });
    return false;
  }

  log.info("Share link revoked", { linkId, userId });
  return true;
}

/**
 * Get all share links for a user.
 * Uses user-scoped client (RLS filters automatically).
 */
export async function getUserShareLinks(
  userId: string
): Promise<ShareLink[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shared_links")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    log.error("Failed to fetch user share links", { error, userId });
    return [];
  }

  return (data || []) as ShareLink[];
}

/**
 * Get the actual shared resource data by validating a share token.
 * Uses service client to bypass RLS for public access.
 */
export async function getSharedResource(
  token: string
): Promise<SharedResource | null> {
  // Validate the share link first
  const link = await getShareLink(token);
  if (!link) {
    return null;
  }

  const supabase = createServiceClient();
  const { table } = RESOURCE_TABLE_MAP[link.resource_type as ShareableResourceType];

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", link.resource_id)
    .single();

  if (error || !data) {
    log.error("Failed to fetch shared resource", {
      error,
      resourceType: link.resource_type,
      resourceId: link.resource_id,
    });
    return null;
  }

  return {
    link,
    resource: data as Record<string, unknown>,
    resourceType: link.resource_type as ShareableResourceType,
  };
}
