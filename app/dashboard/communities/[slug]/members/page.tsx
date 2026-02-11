"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ModerationTools, RoleBadge } from "@/components/communities/ModerationTools";
import { MemberRowSkeleton } from "@/components/communities/CommunitySkeleton";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Community, CommunityMember } from "@/lib/communities/types";

export default function CommunityMembersPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

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
        // Response shape: { data: { community, membership, recentPosts } }
        setCommunity(communityJson.data.community);
        setIsOwner(communityJson.data.membership?.role === "owner");

        // Fetch members
        const membersRes = await fetch(
          `/api/communities/${slug}/members`
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

  async function handlePromote(_userId: string) {
    // No role change endpoint exists yet in the API
    toast.error("Role management is not yet available");
  }

  async function handleDemote(_userId: string) {
    // No role change endpoint exists yet in the API
    toast.error("Role management is not yet available");
  }

  async function handleRemove(userId: string) {
    if (!community) return;
    try {
      const res = await fetch(
        `/api/communities/${slug}/members?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.userId !== userId));
        toast.success("Member removed");
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to remove member");
      }
    } catch {
      toast.error("Failed to remove member");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500 w-full md:max-w-2xl md:mx-auto">
        <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <MemberRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!community) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full md:max-w-2xl md:mx-auto">
      {/* Back */}
      <Button variant="ghost" asChild className="min-h-[44px] -ml-3">
        <Link href={`/dashboard/communities/${slug}`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {community.name}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Members
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {community.memberCount} {community.memberCount === 1 ? "member" : "members"} in {community.name}
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
              key={member.userId}
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
                {isOwner && (
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
