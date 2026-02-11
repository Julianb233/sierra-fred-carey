"use client";

import { Button } from "@/components/ui/button";
import { PostCard } from "./PostCard";
import { PostCardSkeleton } from "./CommunitySkeleton";
import type { CommunityPost } from "@/lib/communities/types";

interface CommunityFeedProps {
  posts: CommunityPost[];
  communitySlug: string;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onReact?: (postId: string) => void;
  onReply?: (postId: string, content: string) => Promise<void> | void;
  isCreator?: boolean;
  onPin?: (postId: string) => void;
  onRemove?: (postId: string) => void;
}

export function CommunityFeed({
  posts,
  communitySlug,
  loading,
  hasMore,
  onLoadMore,
  onReact,
  onReply,
  isCreator,
  onPin,
  onRemove,
}: CommunityFeedProps) {
  if (loading && posts.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!loading && posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No posts yet. Be the first to share something!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          communitySlug={communitySlug}
          onReact={onReact}
          onReply={onReply}
          isCreator={isCreator}
          onPin={onPin}
          onRemove={onRemove}
        />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            className="min-h-[44px]"
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
