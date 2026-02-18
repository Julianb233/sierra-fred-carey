"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CommunityCard } from "@/components/communities/CommunityCard";
import { CommunityCardSkeleton } from "@/components/communities/CommunitySkeleton";
import { CreateCommunityDialog } from "@/components/communities/CreateCommunityDialog";
import { Search, Users } from "lucide-react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
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
  const [showMyOnly, setShowMyOnly] = useState(false);
  const [joiningSlugs, setJoiningSlugs] = useState<Set<string>>(new Set());
  const [error, setError] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    fetchCommunities();

    const timeoutId = setTimeout(() => {
      setTimedOut(true);
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, []);

  async function fetchCommunities() {
    setError(false);
    try {
      const res = await fetch("/api/communities");
      if (res.ok) {
        const json = await res.json();
        setCommunities(json.data ?? []);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(communitySlug: string) {
    setJoiningSlugs((prev) => new Set(prev).add(communitySlug));
    try {
      const res = await fetch(`/api/communities/${communitySlug}/members`, { method: "POST" });
      if (res.ok) {
        setCommunities((prev) =>
          prev.map((c) =>
            c.slug === communitySlug
              ? { ...c, isMember: true, memberCount: c.memberCount + 1 }
              : c
          )
        );
      } else {
        toast.error("Failed to join community");
      }
    } catch {
      toast.error("Failed to join community");
    } finally {
      setJoiningSlugs((prev) => {
        const next = new Set(prev);
        next.delete(communitySlug);
        return next;
      });
    }
  }

  async function handleLeave(communitySlug: string) {
    if (!window.confirm("Leave this community?")) return;
    setJoiningSlugs((prev) => new Set(prev).add(communitySlug));
    try {
      const res = await fetch(`/api/communities/${communitySlug}/members`, { method: "DELETE" });
      if (res.ok) {
        setCommunities((prev) =>
          prev.map((c) =>
            c.slug === communitySlug
              ? { ...c, isMember: false, memberCount: Math.max(0, c.memberCount - 1) }
              : c
          )
        );
      } else {
        toast.error("Failed to leave community");
      }
    } catch {
      toast.error("Failed to leave community");
    } finally {
      setJoiningSlugs((prev) => {
        const next = new Set(prev);
        next.delete(communitySlug);
        return next;
      });
    }
  }

  // Filter communities
  const filtered = communities.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || c.category === activeCategory;
    const matchesMy = !showMyOnly || c.isMember;
    return matchesSearch && matchesCategory && matchesMy;
  });

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500" data-testid="communities-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            Communities
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Connect with fellow founders
          </p>
        </div>
        <CreateCommunityDialog onCreated={fetchCommunities} />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search communities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-base min-h-[44px]"
        />
      </div>

      {/* Category pills + My Communities toggle — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={activeCategory === cat.value && !showMyOnly ? "orange" : "outline"}
            size="sm"
            className="min-h-[44px] whitespace-nowrap shrink-0 text-sm"
            onClick={() => { setActiveCategory(cat.value); setShowMyOnly(false); }}
          >
            {cat.label}
          </Button>
        ))}
        <div className="w-px bg-gray-200 dark:bg-gray-700 shrink-0 self-stretch" />
        <Button
          variant={showMyOnly ? "orange" : "outline"}
          size="sm"
          className="min-h-[44px] whitespace-nowrap shrink-0 text-sm"
          onClick={() => setShowMyOnly(!showMyOnly)}
        >
          My Communities
        </Button>
      </div>

      {/* Communities grid — exact spec breakpoints */}
      {error ? (
        <div className="text-center py-16">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Failed to load communities
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            Something went wrong. Please try again.
          </p>
          <Button variant="outline" className="min-h-[44px]" onClick={fetchCommunities}>
            Retry
          </Button>
        </div>
      ) : loading && !timedOut ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CommunityCardSkeleton key={i} />
          ))}
        </div>
      ) : (loading && timedOut) || filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {loading && timedOut
              ? "Communities are taking a while to load"
              : search || activeCategory !== "all" || showMyOnly
              ? "No communities found"
              : "No communities yet"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            {loading && timedOut
              ? "Try refreshing the page or check back later."
              : search || activeCategory !== "all" || showMyOnly
              ? "Try adjusting your search or filters."
              : "Be the first to create a community for founders."}
          </p>
          {!search && activeCategory === "all" && !showMyOnly && (
            <CreateCommunityDialog onCreated={fetchCommunities}>
              <Button variant="orange" className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" />
                Create Community
              </Button>
            </CreateCommunityDialog>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-6">
          {filtered.map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              onJoin={handleJoin}
              onLeave={handleLeave}
              isJoining={joiningSlugs.has(community.slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
