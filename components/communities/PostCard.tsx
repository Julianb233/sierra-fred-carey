"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HeartIcon, ChatBubbleIcon, DrawingPinIcon } from "@radix-ui/react-icons";
import { MessageCircleQuestion } from "lucide-react";
import type { CommunityPost } from "@/lib/communities/types";
import { ReplyThread } from "./ReplyThread";

interface PostCardProps {
  post: CommunityPost;
  onReact?: (postId: string) => void;
  onReply?: (postId: string, content: string) => void;
  isCreator?: boolean;
  onPin?: (postId: string) => void;
  onRemove?: (postId: string) => void;
}

export function PostCard({ post, onReact, onReply, isCreator, onPin, onRemove }: PostCardProps) {
  const [showReplies, setShowReplies] = useState(false);

  const initials = (post.author_name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("");

  const timeAgo = getTimeAgo(post.created_at);

  return (
    <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm overflow-hidden">
      <div className="p-4 sm:p-5">
        {/* Pinned indicator */}
        {post.is_pinned && (
          <div className="flex items-center gap-1.5 text-xs text-[#ff6a1a] mb-2">
            <DrawingPinIcon className="h-3 w-3" />
            <span className="font-medium">Pinned</span>
          </div>
        )}

        {/* Author row */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9 border border-gray-200 dark:border-gray-700">
            <AvatarFallback className="bg-gradient-to-br from-[#ff6a1a] to-orange-400 text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {post.author_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</p>
          </div>
          {post.type === "question" && (
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs">
              <MessageCircleQuestion className="h-3 w-3 mr-1" />
              Question
            </Badge>
          )}
        </div>

        {/* Title */}
        {post.title && (
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1.5 text-base">
            {post.title}
          </h3>
        )}

        {/* Content */}
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>

        {/* Reaction bar */}
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button
            variant="ghost"
            size="sm"
            className={`min-h-[44px] min-w-[44px] gap-1.5 text-sm ${
              post.user_has_reacted
                ? "text-[#ff6a1a]"
                : "text-gray-500 dark:text-gray-400"
            }`}
            onClick={() => onReact?.(post.id)}
          >
            <HeartIcon className="h-4 w-4" />
            {post.reaction_count > 0 && <span>{post.reaction_count}</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px] min-w-[44px] gap-1.5 text-sm text-gray-500 dark:text-gray-400"
            onClick={() => setShowReplies(!showReplies)}
          >
            <ChatBubbleIcon className="h-4 w-4" />
            {post.reply_count > 0 && <span>{post.reply_count}</span>}
          </Button>

          {/* Creator moderation */}
          {isCreator && (
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] text-xs text-gray-500 hover:text-[#ff6a1a]"
                onClick={() => onPin?.(post.id)}
              >
                {post.is_pinned ? "Unpin" : "Pin"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] text-xs text-gray-500 hover:text-red-500"
                onClick={() => onRemove?.(post.id)}
              >
                Remove
              </Button>
            </div>
          )}
        </div>

        {/* Reply thread */}
        {showReplies && (
          <ReplyThread postId={post.id} onReply={onReply} />
        )}
      </div>
    </Card>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
