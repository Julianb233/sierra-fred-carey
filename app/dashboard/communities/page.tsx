"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CommunityCard } from "@/components/communities/CommunityCard";
import { PlusIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Users } from "lucide-react";
import type { Community, CommunityCategory } from "@/lib/communities/types";

const CATEGORIES: { value: CommunityCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  { value: "industry", label: "Industry" },
  { value: "stage", label: "Stage" },
  { value: "topic", label: "Topic" },
];

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CommunityCategory | "all">("all");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    fetchCommunities();
  }, []);

  async function fetchCommunities() {
    try {
      const res = await fetch("/api/communities");
      if (res.ok) {
        const json = await res.json();
        setCommunities(json.data ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(communityId: string) {
    setJoiningId(communityId);
    try {
      const res = await fetch(`/api/communities/${communityId}/join`, { method: "POST" });
      if (res.ok) {
        setCommunities((prev) =>
          prev.map((c) =>
            c.id === communityId
              ? { ...c, is_member: true, member_count: c.member_count + 1 }
              : c
          )
        );
      }
    } finally {
      setJoiningId(null);
    }
  }

  async function handleLeave(communityId: string) {
    setJoiningId(communityId);
    try {
      const res = await fetch(`/api/communities/${communityId}/leave`, { method: "POST" });
      if (res.ok) {
        setCommunities((prev) =>
          prev.map((c) =>
            c.id === communityId
              ? { ...c, is_member: false, member_count: Math.max(0, c.member_count - 1) }
              : c
          )
        );
      }
    } finally {
      setJoiningId(null);
    }
  }

  // Filter communities
  const filtered = communities.filter((c) => {
    const matchesSearch =
      !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || c.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            Communities
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Connect with fellow founders
          </p>
        </div>
        <Button variant="orange" asChild className="min-h-[44px]">
          <Link href="/dashboard/communities/create">
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Community
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search communities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-base h-11"
        />
      </div>

      {/* Category tabs — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={activeCategory === cat.value ? "orange" : "outline"}
            size="sm"
            className="min-h-[44px] whitespace-nowrap shrink-0 text-sm"
            onClick={() => setActiveCategory(cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Communities grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {search || activeCategory !== "all" ? "No communities found" : "No communities yet"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            {search || activeCategory !== "all"
              ? "Try adjusting your search or filters."
              : "Be the first to create a community for founders."}
          </p>
          {!search && activeCategory === "all" && (
            <Button variant="orange" asChild className="min-h-[44px]">
              <Link href="/dashboard/communities/create">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Community
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              onJoin={handleJoin}
              onLeave={handleLeave}
              isJoining={joiningId === community.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
