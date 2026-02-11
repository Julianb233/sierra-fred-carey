/**
 * Community feature types — Phase 41
 *
 * Field names use camelCase to match the API response shapes
 * from the backend (Drizzle ORM returns camelCase by default).
 */

export type CommunityCategory = "general" | "industry" | "stage" | "topic";

export interface Community {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CommunityCategory;
  coverImageUrl: string | null;
  creatorId: string;
  memberCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  // Added by browse endpoint
  isMember?: boolean;
  memberRole?: string | null;
}

export type PostType = "post" | "question" | "update";

export interface CommunityPost {
  id: string;
  communityId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  postType: PostType;
  title: string;
  content: string;
  isPinned: boolean;
  replyCount: number;
  reactionCount: number;
  userHasReacted?: boolean;
  createdAt: string;
}

export interface PostReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  createdAt: string;
}

export type MemberRole = "owner" | "moderator" | "member";

export interface CommunityMember {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: MemberRole;
  joinedAt: string;
}
