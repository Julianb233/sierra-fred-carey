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

export type CommunityRole = "creator" | "moderator" | "member";
export type PostType = "post" | "question" | "update";

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  creatorId: string;
  iconUrl: string | null;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityMember {
  communityId: string;
  userId: string;
  role: CommunityRole;
  joinedAt: string;
}

export interface CommunityPost {
  id: string;
  communityId: string;
  authorId: string;
  type: PostType;
  title: string | null;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostReaction {
  postId: string;
  userId: string;
  reactionType: string;
  createdAt: string;
}

export interface PostReply {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function mapCommunity(row: Record<string, unknown>): Community {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    description: (row.description as string) ?? null,
    category: (row.category as string) ?? null,
    creatorId: row.creator_id as string,
    iconUrl: (row.icon_url as string) ?? null,
    memberCount: (row.member_count as number) ?? 0,
    isActive: row.is_active !== false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapMember(row: Record<string, unknown>): CommunityMember {
  return {
    communityId: row.community_id as string,
    userId: row.user_id as string,
    role: row.role as CommunityRole,
    joinedAt: row.joined_at as string,
  };
}

function mapPost(row: Record<string, unknown>): CommunityPost {
  return {
    id: row.id as string,
    communityId: row.community_id as string,
    authorId: row.author_id as string,
    type: (row.type as PostType) ?? "post",
    title: (row.title as string) ?? null,
    content: row.content as string,
    isPinned: row.is_pinned === true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapReply(row: Record<string, unknown>): PostReply {
  return {
    id: row.id as string,
    postId: row.post_id as string,
    authorId: row.author_id as string,
    content: row.content as string,
    createdAt: row.created_at as string,
  };
}

function mapReaction(row: Record<string, unknown>): PostReaction {
  return {
    postId: row.post_id as string,
    userId: row.user_id as string,
    reactionType: row.reaction_type as string,
    createdAt: row.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// Communities CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new community. The creator is automatically added as a member
 * with role 'creator' and member_count starts at 1.
 */
export async function createCommunity(params: {
  name: string;
  slug: string;
  description?: string;
  category?: string;
  creatorId: string;
  iconUrl?: string;
}): Promise<Community> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("communities")
    .insert({
      name: params.name,
      slug: params.slug,
      description: params.description ?? null,
      category: params.category ?? null,
      creator_id: params.creatorId,
      icon_url: params.iconUrl ?? null,
      member_count: 1,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create community: ${error.message}`);
  }

  // Auto-add creator as member with "creator" role
  const { error: memberError } = await supabase
    .from("community_members")
    .insert({
      community_id: data.id,
      user_id: params.creatorId,
      role: "creator",
    });

  if (memberError) {
    // Clean up orphaned community
    await supabase.from("communities").delete().eq("id", data.id);
    throw new Error(`Failed to add creator as member: ${memberError.message}`);
  }

  return mapCommunity(data);
}

/**
 * Get a community by its unique slug.
 */
export async function getCommunityBySlug(
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

  return mapCommunity(data);
}

/**
 * Get a community by ID.
 */
export async function getCommunity(id: string): Promise<Community | null> {
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

  return mapCommunity(data);
}

/**
 * List communities with optional filters and search.
 */
export async function listCommunities(opts?: {
  search?: string;
  category?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ communities: Community[]; total: number }> {
  const supabase = createServiceClient();
  const limit = opts?.limit || 20;
  const offset = opts?.offset || 0;

  let query = supabase
    .from("communities")
    .select("*", { count: "exact" })
    .eq("is_active", opts?.isActive !== false)
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

  const { data, error, count } = await query;

  if (error) {
    if (
      error.code === "PGRST205" ||
      error.message?.includes("relation") ||
      error.code === "42P01"
    ) {
      return { communities: [], total: 0 };
    }
    throw new Error(`Failed to list communities: ${error.message}`);
  }

  return {
    communities: (data || []).map(mapCommunity),
    total: count || 0,
  };
}

/**
 * Update a community. Caller should verify ownership before calling.
 */
export async function updateCommunity(
  id: string,
  updates: Partial<{
    name: string;
    description: string;
    category: string;
    iconUrl: string;
    isActive: boolean;
  }>
): Promise<Community> {
  const supabase = createServiceClient();

  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined)
    dbUpdates.description = updates.description;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.iconUrl !== undefined) dbUpdates.icon_url = updates.iconUrl;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { data, error } = await supabase
    .from("communities")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update community: ${error.message}`);
  }

  return mapCommunity(data);
}

/**
 * Delete a community by ID.
 */
export async function deleteCommunity(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("communities").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete community: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

/**
 * Join a community (adds user as 'member' role).
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

  // Increment member_count
  const { data: community } = await supabase
    .from("communities")
    .select("member_count")
    .eq("id", communityId)
    .single();

  if (community) {
    await supabase
      .from("communities")
      .update({ member_count: (community.member_count as number) + 1 })
      .eq("id", communityId);
  }

  return mapMember(data);
}

/**
 * Leave a community.
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

  // Decrement member_count
  const { data: community } = await supabase
    .from("communities")
    .select("member_count")
    .eq("id", communityId)
    .single();

  if (community && (community.member_count as number) > 0) {
    await supabase
      .from("communities")
      .update({ member_count: (community.member_count as number) - 1 })
      .eq("id", communityId);
  }
}

/**
 * Get a user's membership in a community.
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

  return mapMember(data);
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

  return (data || []).map(mapMember);
}

/**
 * Update a member's role (e.g., promote to moderator).
 */
export async function updateMemberRole(
  communityId: string,
  userId: string,
  role: CommunityRole
): Promise<CommunityMember> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("community_members")
    .update({ role })
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update member role: ${error.message}`);
  }

  return mapMember(data);
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

/**
 * Create a post in a community.
 */
export async function createPost(params: {
  communityId: string;
  authorId: string;
  type?: PostType;
  title?: string;
  content: string;
}): Promise<CommunityPost> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      community_id: params.communityId,
      author_id: params.authorId,
      type: params.type ?? "post",
      title: params.title ?? null,
      content: params.content,
      is_pinned: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create post: ${error.message}`);
  }

  return mapPost(data);
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

  return mapPost(data);
}

/**
 * List posts for a community, pinned first then newest.
 */
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
    query = query.eq("type", opts.type);
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
    posts: (data || []).map(mapPost),
    total: count || 0,
  };
}

/**
 * Update a post. Caller should verify author ownership.
 */
export async function updatePost(
  postId: string,
  authorId: string,
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
    .eq("author_id", authorId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update post: ${error.message}`);
  }

  return mapPost(data);
}

/**
 * Delete a post. Caller should verify author ownership.
 */
export async function deletePost(
  postId: string,
  authorId: string
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", authorId);

  if (error) {
    throw new Error(`Failed to delete post: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

/**
 * Create a reply on a post.
 */
export async function createReply(params: {
  postId: string;
  authorId: string;
  content: string;
}): Promise<PostReply> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("community_post_replies")
    .insert({
      post_id: params.postId,
      author_id: params.authorId,
      content: params.content,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create reply: ${error.message}`);
  }

  return mapReply(data);
}

/**
 * List replies for a post, oldest first.
 */
export async function getReplies(
  postId: string,
  opts?: { limit?: number; offset?: number }
): Promise<{ replies: PostReply[]; total: number }> {
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
    replies: (data || []).map(mapReply),
    total: count || 0,
  };
}

/**
 * Delete a reply. Caller should verify author ownership.
 */
export async function deleteReply(
  replyId: string,
  authorId: string
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("community_post_replies")
    .delete()
    .eq("id", replyId)
    .eq("author_id", authorId);

  if (error) {
    throw new Error(`Failed to delete reply: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Reactions (toggle)
// ---------------------------------------------------------------------------

/**
 * Toggle a reaction on a post. If the user already reacted, remove it.
 * Returns { added: true, reaction } if added, { added: false, reaction: null } if removed.
 */
export async function toggleReaction(params: {
  postId: string;
  userId: string;
  reactionType?: string;
}): Promise<{ added: boolean; reaction: PostReaction | null }> {
  const supabase = createServiceClient();
  const reactionType = params.reactionType ?? "like";

  // Check for existing reaction (composite PK: post_id + user_id)
  const { data: existing } = await supabase
    .from("community_post_reactions")
    .select("*")
    .eq("post_id", params.postId)
    .eq("user_id", params.userId)
    .single();

  if (existing) {
    // Remove existing reaction
    await supabase
      .from("community_post_reactions")
      .delete()
      .eq("post_id", params.postId)
      .eq("user_id", params.userId);

    return { added: false, reaction: null };
  }

  // Add new reaction
  const { data, error } = await supabase
    .from("community_post_reactions")
    .insert({
      post_id: params.postId,
      user_id: params.userId,
      reaction_type: reactionType,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to toggle reaction: ${error.message}`);
  }

  return { added: true, reaction: mapReaction(data) };
}

/**
 * Get all reactions for a post.
 */
export async function getReactions(postId: string): Promise<PostReaction[]> {
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

  return (data || []).map(mapReaction);
}
