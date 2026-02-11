"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "./PostCard";
import type { CommunityPost } from "@/lib/communities/types";

interface CommunityFeedProps {
  posts: CommunityPost[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onReact?: (postId: string) => void;
  onReply?: (postId: string, content: string) => void;
  isCreator?: boolean;
  onPin?: (postId: string) => void;
  onRemove?: (postId: string) => void;
}

export function CommunityFeed({
  posts,
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
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
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
