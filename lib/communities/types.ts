/**
 * Community feature types — Phase 41
 */

export type CommunityCategory = "general" | "industry" | "stage" | "topic";

export interface Community {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CommunityCategory;
  icon_url: string | null;
  creator_id: string;
  member_count: number;
  created_at: string;
  is_member?: boolean;
}

export type PostType = "post" | "question";

export interface CommunityPost {
  id: string;
  community_id: string;
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  type: PostType;
  title: string;
  content: string;
  is_pinned: boolean;
  reply_count: number;
  reaction_count: number;
  user_has_reacted?: boolean;
  created_at: string;
}

export interface PostReply {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  content: string;
  created_at: string;
}

export type MemberRole = "creator" | "moderator" | "member";

export interface CommunityMember {
  user_id: string;
  name: string;
  avatar_url: string | null;
  role: MemberRole;
  joined_at: string;
}
