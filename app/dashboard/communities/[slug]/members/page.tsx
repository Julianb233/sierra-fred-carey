"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ModerationTools, RoleBadge } from "@/components/communities/ModerationTools";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import type { Community, CommunityMember } from "@/lib/communities/types";

export default function CommunityMembersPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch community info
        const communityRes = await fetch(`/api/communities/${slug}`);
        if (!communityRes.ok) {
          router.push("/dashboard/communities");
          return;
        }
        const communityJson = await communityRes.json();
        setCommunity(communityJson.data);
        setCurrentUserId(communityJson.currentUserId ?? null);

        // Fetch members
        const membersRes = await fetch(
          `/api/communities/${communityJson.data.id}/members`
        );
        if (membersRes.ok) {
          const membersJson = await membersRes.json();
          setMembers(membersJson.data ?? []);
        }
      } catch {
        router.push("/dashboard/communities");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug, router]);

  const isCreator = community?.creator_id === currentUserId;

  async function handlePromote(userId: string) {
    if (!community) return;
    try {
      const res = await fetch(`/api/communities/${community.id}/members/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "moderator" }),
      });
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.user_id === userId ? { ...m, role: "moderator" } : m))
        );
        toast.success("Member promoted to moderator");
      }
    } catch {
      toast.error("Failed to promote member");
    }
  }

  async function handleDemote(userId: string) {
    if (!community) return;
    try {
      const res = await fetch(`/api/communities/${community.id}/members/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "member" }),
      });
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.user_id === userId ? { ...m, role: "member" } : m))
        );
        toast.success("Member demoted");
      }
    } catch {
      toast.error("Failed to demote member");
    }
  }

  async function handleRemove(userId: string) {
    if (!community) return;
    try {
      const res = await fetch(`/api/communities/${community.id}/members/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.user_id !== userId));
        toast.success("Member removed");
      }
    } catch {
      toast.error("Failed to remove member");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500 max-w-[720px] mx-auto">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!community) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[720px] mx-auto">
      {/* Back */}
      <Button variant="ghost" asChild className="min-h-[44px] -ml-3">
        <Link href={`/dashboard/communities/${slug}`}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to {community.name}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Members
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {community.member_count} {community.member_count === 1 ? "member" : "members"} in {community.name}
        </p>
      </div>

      {/* Members grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {members.map((member) => {
          const initials = (member.name || "?")
            .split(" ")
            .map((n) => n[0])
            .join("");

          return (
            <div
              key={member.user_id}
              className="flex items-center gap-3 p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-orange-100/20 dark:border-white/5 hover:shadow-md transition-all"
            >
              <Avatar className="h-11 w-11 border border-gray-200 dark:border-gray-700 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-[#ff6a1a] to-orange-400 text-white text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {member.name}
                </p>
                <RoleBadge role={member.role} />

                {/* Moderation tools — only for creator */}
                {isCreator && (
                  <div className="mt-2">
                    <ModerationTools
                      member={member}
                      onPromote={handlePromote}
                      onDemote={handleDemote}
                      onRemove={handleRemove}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {members.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No members to display.
          </p>
        </div>
      )}
    </div>
  );
}
