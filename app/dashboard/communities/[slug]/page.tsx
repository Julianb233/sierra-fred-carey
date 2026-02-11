"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunityFeed } from "@/components/communities/CommunityFeed";
import { CreatePostForm, CreatePostFormDesktop } from "@/components/communities/CreatePostForm";
import { PostCardSkeleton } from "@/components/communities/CommunitySkeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Users } from "lucide-react";
import { PersonIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import type { Community, CommunityPost, CommunityMember, PostType } from "@/lib/communities/types";

const PAGE_SIZE = 20;

export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [postPage, setPostPage] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch community details
  useEffect(() => {
    async function fetchCommunity() {
      try {
        const res = await fetch(`/api/communities/${slug}`);
        if (!res.ok) {
          router.push("/dashboard/communities");
          return;
        }
        const json = await res.json();
        setCommunity(json.data);
        setCurrentUserId(json.currentUserId ?? null);
      } catch {
        router.push("/dashboard/communities");
      } finally {
        setLoading(false);
      }
    }
    fetchCommunity();
  }, [slug, router]);

  // Fetch posts
  const fetchPosts = useCallback(
    async (page: number) => {
      if (!community) return;
      setPostsLoading(true);
      try {
        const res = await fetch(
          `/api/communities/${community.id}/posts?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
        );
        if (res.ok) {
          const json = await res.json();
          const newPosts: CommunityPost[] = json.data ?? [];
          setPosts((prev) => (page === 0 ? newPosts : [...prev, ...newPosts]));
          setHasMorePosts(newPosts.length === PAGE_SIZE);
        }
      } catch {
        // silently fail
      } finally {
        setPostsLoading(false);
      }
    },
    [community]
  );

  useEffect(() => {
    if (community) {
      if (community.is_member) {
        fetchPosts(0);
      } else {
        setPostsLoading(false);
      }
      fetchMembers();
    }
  }, [community, fetchPosts]);

  async function fetchMembers() {
    if (!community) return;
    try {
      const res = await fetch(`/api/communities/${community.id}/members?limit=10`);
      if (res.ok) {
        const json = await res.json();
        setMembers(json.data ?? []);
      }
    } catch {
      // silently fail
    }
  }

  async function handleJoin() {
    if (!community) return;
    try {
      const res = await fetch(`/api/communities/${community.id}/join`, { method: "POST" });
      if (res.ok) {
        setCommunity((prev) =>
          prev ? { ...prev, is_member: true, member_count: prev.member_count + 1 } : prev
        );
        toast.success("Joined community!");
      }
    } catch {
      toast.error("Failed to join");
    }
  }

  async function handleLeave() {
    if (!community) return;
    try {
      const res = await fetch(`/api/communities/${community.id}/leave`, { method: "POST" });
      if (res.ok) {
        setCommunity((prev) =>
          prev
            ? { ...prev, is_member: false, member_count: Math.max(0, prev.member_count - 1) }
            : prev
        );
        toast.success("Left community");
      }
    } catch {
      toast.error("Failed to leave");
    }
  }

  async function handleCreatePost(data: { title: string; content: string; type: PostType }) {
    if (!community) return;
    const res = await fetch(`/api/communities/${community.id}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        setPosts((prev) => [json.data, ...prev]);
      }
      toast.success("Post created!");
    } else {
      toast.error("Failed to create post");
    }
  }

  async function handleReact(postId: string) {
    const res = await fetch(`/api/communities/posts/${postId}/react`, { method: "POST" });
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                user_has_reacted: !p.user_has_reacted,
                reaction_count: p.user_has_reacted
                  ? p.reaction_count - 1
                  : p.reaction_count + 1,
              }
            : p
        )
      );
    }
  }

  async function handleReply(postId: string, content: string) {
    const res = await fetch(`/api/communities/posts/${postId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, reply_count: p.reply_count + 1 } : p))
      );
    }
  }

  async function handlePin(postId: string) {
    if (!community) return;
    const res = await fetch(`/api/communities/posts/${postId}/pin`, { method: "POST" });
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, is_pinned: !p.is_pinned } : p))
      );
    }
  }

  async function handleRemovePost(postId: string) {
    const res = await fetch(`/api/communities/posts/${postId}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Post removed");
    }
  }

  const isCreator = community?.creator_id === currentUserId;

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="w-full md:max-w-2xl md:mx-auto lg:max-w-3xl space-y-4">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      </div>
    );
  }

  if (!community) return null;

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
      {/* Back */}
      <Button variant="ghost" asChild className="min-h-[44px] -ml-3">
        <Link href="/dashboard/communities">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Communities
        </Link>
      </Button>

      {/* Community header */}
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#ff6a1a] to-orange-400 flex items-center justify-center text-white shrink-0">
          {community.icon_url ? (
            <img src={community.icon_url} alt="" className="h-8 w-8 rounded object-cover" />
          ) : (
            <Users className="h-7 w-7" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {community.name}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {community.description}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <PersonIcon className="h-3.5 w-3.5" />
              <span>{community.member_count} members</span>
            </div>
            <Badge className="text-xs capitalize bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {community.category}
            </Badge>
          </div>
        </div>
        <div className="shrink-0">
          {community.is_member ? (
            <Button variant="outline" className="min-h-[44px]" onClick={handleLeave}>
              Leave
            </Button>
          ) : (
            <Button variant="orange" className="min-h-[44px]" onClick={handleJoin}>
              Join Community
            </Button>
          )}
        </div>
      </div>

      {/* Non-member gating */}
      {!community.is_member ? (
        <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
          <div className="p-8 md:p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-[#ff6a1a]/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-[#ff6a1a]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Join this community to see posts and participate
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Become a member to view the feed, share posts, ask questions, and connect with other founders.
            </p>
            <Button variant="orange" className="min-h-[44px]" onClick={handleJoin}>
              Join Community
            </Button>
          </div>
        </Card>
      ) : (
        /* Member view — tabs */
        <Tabs defaultValue="posts" className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="w-auto min-w-fit">
              <TabsTrigger value="posts" className="min-h-[44px] min-w-[80px]">
                Posts
              </TabsTrigger>
              <TabsTrigger value="members" className="min-h-[44px] min-w-[80px]">
                Members
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="posts">
            <div className="w-full md:max-w-2xl md:mx-auto lg:max-w-3xl space-y-4">
              {/* Create post — collapsible on mobile, always visible on desktop */}
              <div className="lg:hidden">
                <CreatePostForm communityId={community.id} onSubmit={handleCreatePost} />
              </div>
              <div className="hidden lg:block">
                <CreatePostFormDesktop communityId={community.id} onSubmit={handleCreatePost} />
              </div>

              <CommunityFeed
                posts={posts}
                loading={postsLoading}
                hasMore={hasMorePosts}
                onLoadMore={() => {
                  const nextPage = postPage + 1;
                  setPostPage(nextPage);
                  fetchPosts(nextPage);
                }}
                onReact={handleReact}
                onReply={handleReply}
                isCreator={isCreator}
                onPin={handlePin}
                onRemove={handleRemovePost}
              />
            </div>
          </TabsContent>

          <TabsContent value="members">
            <div className="w-full md:max-w-2xl md:mx-auto">
              {members.length === 0 ? (
                <p className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
                  No members to show.
                </p>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => {
                    const initials = (member.name || "?")
                      .split(" ")
                      .map((n) => n[0])
                      .join("");

                    return (
                      <div
                        key={member.user_id}
                        className="flex items-center gap-3 p-3 min-h-[56px] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <Avatar className="h-10 w-10 border border-gray-200 dark:border-gray-700">
                          <AvatarFallback className="bg-gradient-to-br from-[#ff6a1a] to-orange-400 text-white text-sm font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {member.name}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs mt-0.5 ${
                              member.role === "creator"
                                ? "border-[#ff6a1a]/20 text-[#ff6a1a]"
                                : member.role === "moderator"
                                ? "border-blue-200 text-blue-600 dark:text-blue-400"
                                : ""
                            }`}
                          >
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-center pt-4">
                    <Button variant="outline" asChild className="min-h-[44px]">
                      <Link href={`/dashboard/communities/${slug}/members`}>
                        View All Members
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
