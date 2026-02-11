/**
 * Founder Communities Database Operations
 * Phase 41: Founder Communities
 *
 * CRUD operations for communities, members, posts, replies, and reactions.
 * Tables defined in migration 051_founder_communities.sql.
 * Uses Supabase service client for server-side operations.
 */

import { createServiceClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CommunityRole = "owner" | "moderator" | "member";
export type PostType = "post" | "question" | "update" | "milestone";
export type ReactionType = "like" | "insightful" | "support";

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  coverImageUrl: string | null;
  creatorId: string;
  memberCount: number;
  isPrivate: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  role: CommunityRole;
  joinedAt: string;
}

export interface CommunityPost {
  id: string;
  communityId: string;
  authorId: string;
  title: string;
  content: string;
  postType: PostType;
  isPinned: boolean;
  reactionCount: number;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityPostReaction {
  id: string;
  postId: string;
  userId: string;
  reactionType: ReactionType;
  createdAt: string;
}

export interface CommunityPostReply {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentReplyId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Row interfaces (DB column names)
// ---------------------------------------------------------------------------

interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  cover_image_url: string | null;
  creator_id: string;
  member_count: number;
  is_private: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

interface MemberRow {
  id: string;
  community_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

interface PostRow {
  id: string;
  community_id: string;
  author_id: string;
  title: string;
  content: string;
  post_type: string;
  is_pinned: boolean;
  reaction_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
}

interface ReactionRow {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

interface ReplyRow {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_reply_id: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function mapCommunity(row: CommunityRow): Community {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    coverImageUrl: row.cover_image_url,
    creatorId: row.creator_id,
    memberCount: row.member_count,
    isPrivate: row.is_private,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMember(row: MemberRow): CommunityMember {
  return {
    id: row.id,
    communityId: row.community_id,
    userId: row.user_id,
    role: row.role as CommunityRole,
    joinedAt: row.joined_at,
  };
}

function mapPost(row: PostRow): CommunityPost {
  return {
    id: row.id,
    communityId: row.community_id,
    authorId: row.author_id,
    title: row.title,
    content: row.content,
    postType: row.post_type as PostType,
    isPinned: row.is_pinned,
    reactionCount: row.reaction_count,
    replyCount: row.reply_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReaction(row: ReactionRow): CommunityPostReaction {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    reactionType: row.reaction_type as ReactionType,
    createdAt: row.created_at,
  };
}

function mapReply(row: ReplyRow): CommunityPostReply {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    content: row.content,
    parentReplyId: row.parent_reply_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Communities CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new community. The creator is automatically added as 'owner'.
 * member_count starts at 0; the DB trigger increments it to 1 on owner INSERT.
 */
export async function createCommunity(params: {
  userId: string;
  name: string;
  slug?: string;
  description: string;
  category: string;
  coverImageUrl?: string;
  isPrivate?: boolean;
}): Promise<Community> {
  const supabase = createServiceClient();

  const slug =
    params.slug ??
    params.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
      "-" +
      Date.now().toString(36);

  const { data, error } = await supabase
    .from("communities")
    .insert({
      name: params.name,
      slug,
      description: params.description,
      category: params.category,
      cover_image_url: params.coverImageUrl ?? null,
      creator_id: params.userId,
      member_count: 0, // trigger increments to 1 on owner INSERT
      is_private: params.isPrivate ?? false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create community: ${error.message}`);
  }

  // Add creator as owner
  const { error: memberError } = await supabase
    .from("community_members")
    .insert({
      community_id: data.id,
      user_id: params.userId,
      role: "owner",
    });

  if (memberError) {
    await supabase.from("communities").delete().eq("id", data.id);
    throw new Error(`Failed to add creator as owner: ${memberError.message}`);
  }

  // Re-fetch to get trigger-updated member_count
  const { data: refreshed } = await supabase
    .from("communities")
    .select("*")
    .eq("id", data.id)
    .single();

  return mapCommunity((refreshed ?? data) as CommunityRow);
}

/**
 * Get a community by slug.
 */
export async function getCommunity(
  slug: string
): Promise<Community | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get community: ${error.message}`);
  }

  return mapCommunity(data as CommunityRow);
}

/**
 * Get a community by ID.
 */
export async function getCommunityById(
  id: string
): Promise<Community | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get community: ${error.message}`);
  }

  return mapCommunity(data as CommunityRow);
}

/**
 * List communities with optional filters and search.
 */
export async function listCommunities(opts?: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Community[]> {
  const supabase = createServiceClient();
  const limit = opts?.limit || 20;
  const offset = opts?.offset || 0;

  let query = supabase
    .from("communities")
    .select("*")
    .eq("is_archived", false)
    .eq("is_private", false)
    .order("member_count", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts?.search) {
    query = query.or(
      `name.ilike.%${opts.search}%,description.ilike.%${opts.search}%`
    );
  }

  if (opts?.category) {
    query = query.eq("category", opts.category);
  }

  const { data, error } = await query;

  if (error) {
    if (
      error.code === "PGRST205" ||
      error.message?.includes("relation") ||
      error.code === "42P01"
    ) {
      return [];
    }
    throw new Error(`Failed to list communities: ${error.message}`);
  }

  return (data || []).map((row: CommunityRow) => mapCommunity(row));
}

/**
 * Update a community. Only the owner (creator_id) should call this.
 */
export async function updateCommunity(
  id: string,
  userId: string,
  updates: Partial<
    Pick<
      Community,
      "name" | "description" | "category" | "coverImageUrl" | "isArchived"
    >
  >
): Promise<Community> {
  const supabase = createServiceClient();

  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined)
    dbUpdates.description = updates.description;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.coverImageUrl !== undefined)
    dbUpdates.cover_image_url = updates.coverImageUrl;
  if (updates.isArchived !== undefined)
    dbUpdates.is_archived = updates.isArchived;

  const { data, error } = await supabase
    .from("communities")
    .update(dbUpdates)
    .eq("id", id)
    .eq("creator_id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update community: ${error.message}`);
  }

  return mapCommunity(data as CommunityRow);
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

/**
 * Join a community (adds user as 'member' role).
 * member_count is incremented by the DB trigger.
 */
export async function joinCommunity(
  communityId: string,
  userId: string
): Promise<CommunityMember> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("community_members")
    .insert({
      community_id: communityId,
      user_id: userId,
      role: "member",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to join community: ${error.message}`);
  }

  return mapMember(data as MemberRow);
}

/**
 * Leave a community. member_count is decremented by the DB trigger.
 */
export async function leaveCommunity(
  communityId: string,
  userId: string
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to leave community: ${error.message}`);
  }
}

/**
 * Get all members of a community.
 */
export async function getCommunityMembers(
  communityId: string,
  opts?: { limit?: number; offset?: number }
): Promise<CommunityMember[]> {
  const supabase = createServiceClient();
  const limit = opts?.limit || 50;
  const offset = opts?.offset || 0;

  const { data, error } = await supabase
    .from("community_members")
    .select("*")
    .eq("community_id", communityId)
    .order("joined_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    if (
      error.code === "PGRST205" ||
      error.message?.includes("relation") ||
      error.code === "42P01"
    ) {
      return [];
    }
    throw new Error(`Failed to list members: ${error.message}`);
  }

  return (data || []).map((row: MemberRow) => mapMember(row));
}

/**
 * Get communities a user belongs to.
 */
export async function getUserCommunities(
  userId: string
): Promise<Community[]> {
  const supabase = createServiceClient();

  const { data: memberships, error: memError } = await supabase
    .from("community_members")
    .select("community_id")
    .eq("user_id", userId);

  if (memError) {
    throw new Error(`Failed to get user communities: ${memError.message}`);
  }

  if (!memberships || memberships.length === 0) return [];

  const communityIds = memberships.map(
    (m: { community_id: string }) => m.community_id
  );

  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .in("id", communityIds)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get user communities: ${error.message}`);
  }

  return (data || []).map((row: CommunityRow) => mapCommunity(row));
}

/**
 * Get a user's role in a community, or null if not a member.
 */
export async function getMemberRole(
  communityId: string,
  userId: string
): Promise<string | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get member role: ${error.message}`);
  }

  return data?.role ?? null;
}

/**
 * Get a user's full membership in a community, or null if not a member.
 */
export async function getMembership(
  communityId: string,
  userId: string
): Promise<CommunityMember | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("community_members")
    .select("*")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get membership: ${error.message}`);
  }

  return mapMember(data as MemberRow);
}

/**
 * Update a member's role (e.g., promote to moderator).
 */
export async function updateMemberRole(
  communityId: string,
  targetUserId: string,
  role: CommunityRole
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("community_members")
    .update({ role })
    .eq("community_id", communityId)
    .eq("user_id", targetUserId);

  if (error) {
    throw new Error(`Failed to update member role: ${error.message}`);
  }
}

/**
 * Remove a member from a community. member_count is decremented by the DB trigger.
 */
export async function removeMember(
  communityId: string,
  targetUserId: string
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", targetUserId);

  if (error) {
    throw new Error(`Failed to remove member: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

/**
 * Create a post in a community.
 * reaction_count and reply_count start at 0 (synced by DB triggers).
 */
export async function createPost(params: {
  communityId: string;
  authorId: string;
  title: string;
  content: string;
  postType?: PostType;
}): Promise<CommunityPost> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      community_id: params.communityId,
      author_id: params.authorId,
      title: params.title,
      content: params.content,
      post_type: params.postType ?? "post",
      is_pinned: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create post: ${error.message}`);
  }

  return mapPost(data as PostRow);
}

/**
 * Get a single post by ID.
 */
export async function getPost(postId: string): Promise<CommunityPost | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("community_posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get post: ${error.message}`);
  }

  return mapPost(data as PostRow);
}

/**
 * List posts for a community, pinned first then newest.
 */
export async function listPosts(
  communityId: string,
  opts?: { limit?: number; offset?: number; pinFirst?: boolean }
): Promise<CommunityPost[]> {
  const supabase = createServiceClient();
  const limit = opts?.limit || 20;
  const offset = opts?.offset || 0;
  const pinFirst = opts?.pinFirst !== false;

  let query = supabase
    .from("community_posts")
    .select("*")
    .eq("community_id", communityId);

  if (pinFirst) {
    query = query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    if (
      error.code === "PGRST205" ||
      error.message?.includes("relation") ||
      error.code === "42P01"
    ) {
      return [];
    }
    throw new Error(`Failed to list posts: ${error.message}`);
  }

  return (data || []).map((row: PostRow) => mapPost(row));
}

/**
 * Update a post. Caller should verify author or moderator/owner permission.
 */
export async function updatePost(
  postId: string,
  userId: string,
  updates: Partial<Pick<CommunityPost, "title" | "content" | "isPinned">>
): Promise<CommunityPost> {
  const supabase = createServiceClient();

  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.content !== undefined) payload.content = updates.content;
  if (updates.isPinned !== undefined) payload.is_pinned = updates.isPinned;

  const { data, error } = await supabase
    .from("community_posts")
    .update(payload)
    .eq("id", postId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update post: ${error.message}`);
  }

  return mapPost(data as PostRow);
}

/**
 * Delete a post. Caller should verify author or moderator/owner permission.
 */
export async function deletePost(
  postId: string,
  userId: string
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", postId);

  if (error) {
    throw new Error(`Failed to delete post: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

/**
 * Toggle a reaction on a post. If the user already has this reaction type,
 * remove it; otherwise add it. Returns { added: true } or { added: false }.
 * reaction_count on the post is synced by DB triggers.
 */
export async function toggleReaction(
  postId: string,
  userId: string,
  reactionType: string
): Promise<{ added: boolean }> {
  const supabase = createServiceClient();

  // Check for existing reaction of this type
  const { data: existing } = await supabase
    .from("community_post_reactions")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .eq("reaction_type", reactionType)
    .single();

  if (existing) {
    // Remove existing reaction (trigger decrements reaction_count)
    await supabase
      .from("community_post_reactions")
      .delete()
      .eq("id", existing.id);

    return { added: false };
  }

  // Add new reaction (trigger increments reaction_count)
  const { error } = await supabase.from("community_post_reactions").insert({
    post_id: postId,
    user_id: userId,
    reaction_type: reactionType,
  });

  if (error) {
    throw new Error(`Failed to toggle reaction: ${error.message}`);
  }

  return { added: true };
}

/**
 * Get all reactions for a post.
 */
export async function getPostReactions(
  postId: string
): Promise<CommunityPostReaction[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("community_post_reactions")
    .select("*")
    .eq("post_id", postId);

  if (error) {
    if (
      error.code === "PGRST205" ||
      error.message?.includes("relation") ||
      error.code === "42P01"
    ) {
      return [];
    }
    throw new Error(`Failed to get reactions: ${error.message}`);
  }

  return (data || []).map((row: ReactionRow) => mapReaction(row));
}

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

/**
 * Create a reply on a post. Supports threaded replies via parentReplyId.
 * reply_count on the post is incremented by the DB trigger.
 */
export async function createReply(params: {
  postId: string;
  authorId: string;
  content: string;
  parentReplyId?: string;
}): Promise<CommunityPostReply> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("community_post_replies")
    .insert({
      post_id: params.postId,
      author_id: params.authorId,
      content: params.content,
      parent_reply_id: params.parentReplyId ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create reply: ${error.message}`);
  }

  return mapReply(data as ReplyRow);
}

/**
 * List replies for a post, oldest first.
 */
export async function listReplies(
  postId: string
): Promise<CommunityPostReply[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("community_post_replies")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    if (
      error.code === "PGRST205" ||
      error.message?.includes("relation") ||
      error.code === "42P01"
    ) {
      return [];
    }
    throw new Error(`Failed to list replies: ${error.message}`);
  }

  return (data || []).map((row: ReplyRow) => mapReply(row));
}

/**
 * Update a reply (author only).
 */
export async function updateReply(
  replyId: string,
  userId: string,
  content: string
): Promise<CommunityPostReply> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("community_post_replies")
    .update({ content })
    .eq("id", replyId)
    .eq("author_id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update reply: ${error.message}`);
  }

  return mapReply(data as ReplyRow);
}

/**
 * Delete a reply. Caller should verify author or moderator/owner permission.
 * reply_count on the post is decremented by the DB trigger.
 */
export async function deleteReply(
  replyId: string,
  userId: string
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("community_post_replies")
    .delete()
    .eq("id", replyId);

  if (error) {
    throw new Error(`Failed to delete reply: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Compatibility aliases (used by existing API routes)
// ---------------------------------------------------------------------------

/** Alias: addMember with object params (used by join route). */
export async function addMember(params: {
  communityId: string;
  userId: string;
  role?: CommunityRole;
}): Promise<CommunityMember> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("community_members")
    .insert({
      community_id: params.communityId,
      user_id: params.userId,
      role: params.role ?? "member",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add member: ${error.message}`);
  }

  return mapMember(data as MemberRow);
}

/** Alias: listMembers (used by members route). */
export const listMembers = getCommunityMembers;

/** Alias: getReactions (used by react route). */
export const getReactions = getPostReactions;

/** Alias: getCommunityBySlug (used by some routes). */
export const getCommunityBySlug = getCommunity;

/** Alias: deleteCommunity (used by delete route). */
export async function deleteCommunity(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("communities").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete community: ${error.message}`);
  }
}

/** Alias: getPosts with total count (used by posts route). */
export async function getPosts(
  communityId: string,
  opts?: { limit?: number; offset?: number; type?: PostType }
): Promise<{ posts: CommunityPost[]; total: number }> {
  const supabase = createServiceClient();
  const limit = opts?.limit || 20;
  const offset = opts?.offset || 0;

  let query = supabase
    .from("community_posts")
    .select("*", { count: "exact" })
    .eq("community_id", communityId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts?.type) {
    query = query.eq("post_type", opts.type);
  }

  const { data, error, count } = await query;

  if (error) {
    if (
      error.code === "PGRST205" ||
      error.message?.includes("relation") ||
      error.code === "42P01"
    ) {
      return { posts: [], total: 0 };
    }
    throw new Error(`Failed to list posts: ${error.message}`);
  }

  return {
    posts: (data || []).map((row: PostRow) => mapPost(row)),
    total: count || 0,
  };
}

/** Alias: getReplies with total count (used by replies route). */
export async function getReplies(
  postId: string,
  opts?: { limit?: number; offset?: number }
): Promise<{ replies: CommunityPostReply[]; total: number }> {
  const supabase = createServiceClient();
  const limit = opts?.limit || 50;
  const offset = opts?.offset || 0;

  const { data, error, count } = await supabase
    .from("community_post_replies")
    .select("*", { count: "exact" })
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    if (
      error.code === "PGRST205" ||
      error.message?.includes("relation") ||
      error.code === "42P01"
    ) {
      return { replies: [], total: 0 };
    }
    throw new Error(`Failed to list replies: ${error.message}`);
  }

  return {
    replies: (data || []).map((row: ReplyRow) => mapReply(row)),
    total: count || 0,
  };
}
