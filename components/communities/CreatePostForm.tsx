"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { PlusIcon, Cross2Icon } from "@radix-ui/react-icons";
import type { PostType } from "@/lib/communities/types";

interface CreatePostFormProps {
  communityId: string;
  onSubmit: (data: { title: string; content: string; postType: PostType }) => Promise<void>;
}

export function CreatePostForm({ communityId, onSubmit }: CreatePostFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [postType, setPostType] = useState<PostType>("post");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), content: content.trim(), postType });
      setTitle("");
      setContent("");
      setPostType("post");
      setExpanded(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Collapsed state — mobile-friendly tap target
  if (!expanded) {
    return (
      <Card
        className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm cursor-pointer hover:shadow-md transition-all lg:hidden"
        onClick={() => setExpanded(true)}
      >
        <div className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#ff6a1a]/10 flex items-center justify-center">
            <PlusIcon className="h-5 w-5 text-[#ff6a1a]" />
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Share something with the community...
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white text-base">
            Create a {postType === "question" ? "Question" : "Post"}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px] lg:hidden"
            onClick={() => setExpanded(false)}
          >
            <Cross2Icon className="h-4 w-4" />
          </Button>
        </div>

        {/* Type selector */}
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={postType === "post" ? "orange" : "outline"}
            size="sm"
            className="min-h-[44px] text-sm"
            onClick={() => setPostType("post")}
          >
            Post
          </Button>
          <Button
            type="button"
            variant={postType === "question" ? "orange" : "outline"}
            size="sm"
            className="min-h-[44px] text-sm"
            onClick={() => setPostType("question")}
          >
            Question
          </Button>
        </div>

        <div className="space-y-3">
          <Input
            placeholder={postType === "question" ? "What's your question?" : "Title (optional)"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-base"
          />
          <Textarea
            placeholder={postType === "question" ? "Add more details..." : "What's on your mind?"}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="text-base resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="orange"
              className="min-h-[44px] min-w-[88px]"
              disabled={!content.trim() || submitting}
            >
              {submitting ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

/** Desktop always-visible version */
export function CreatePostFormDesktop(props: CreatePostFormProps) {
  const [postType, setPostType] = useState<PostType>("post");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      await props.onSubmit({ title: title.trim(), content: content.trim(), postType });
      setTitle("");
      setContent("");
      setPostType("post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-4">
          Create a {postType === "question" ? "Question" : "Post"}
        </h3>

        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={postType === "post" ? "orange" : "outline"}
            size="sm"
            className="min-h-[44px] text-sm"
            onClick={() => setPostType("post")}
          >
            Post
          </Button>
          <Button
            type="button"
            variant={postType === "question" ? "orange" : "outline"}
            size="sm"
            className="min-h-[44px] text-sm"
            onClick={() => setPostType("question")}
          >
            Question
          </Button>
        </div>

        <div className="space-y-3">
          <Input
            placeholder={postType === "question" ? "What's your question?" : "Title (optional)"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-base"
          />
          <Textarea
            placeholder={postType === "question" ? "Add more details..." : "What's on your mind?"}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="text-base resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="orange"
              className="min-h-[44px] min-w-[88px]"
              disabled={!content.trim() || submitting}
            >
              {submitting ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
