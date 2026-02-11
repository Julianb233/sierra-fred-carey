"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostReply } from "@/lib/communities/types";

interface ReplyThreadProps {
  postId: string;
  communitySlug: string;
  onReply?: (postId: string, content: string) => Promise<void> | void;
}

export function ReplyThread({ postId, communitySlug, onReply }: ReplyThreadProps) {
  const [replies, setReplies] = useState<PostReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchReplies() {
    try {
      const res = await fetch(
        `/api/communities/${communitySlug}/posts/${postId}/replies`
      );
      if (res.ok) {
        const json = await res.json();
        setReplies(json.data ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReplies();
  }, [postId, communitySlug]);

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !onReply) return;
    setSubmitting(true);
    try {
      await onReply(postId, replyText.trim());
      setReplyText("");
      await fetchReplies();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 pl-4 border-l-2 border-gray-100 dark:border-gray-800 space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-3/4" />
      </div>
    );
  }

  return (
    <div className="mt-4 pl-4 border-l-2 border-gray-100 dark:border-gray-800 space-y-3">
      {replies.map((reply) => {
        const initials = (reply.authorName || "?")
          .split(" ")
          .map((n) => n[0])
          .join("");

        return (
          <div key={reply.id} className="flex gap-2.5">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-[#ff6a1a] to-orange-400 text-white text-[10px] font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {reply.authorName}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(reply.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                {reply.content}
              </p>
            </div>
          </div>
        );
      })}

      {replies.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">No replies yet.</p>
      )}

      {/* Reply input */}
      <div className="flex gap-2 pt-2">
        <Textarea
          placeholder="Write a reply..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={1}
          className="text-sm resize-none flex-1"
        />
        <Button
          variant="orange"
          size="sm"
          className="min-h-[44px] min-w-[44px] shrink-0"
          onClick={handleSubmitReply}
          disabled={!replyText.trim() || submitting}
        >
          Reply
        </Button>
      </div>
    </div>
  );
}
