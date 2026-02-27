"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingBag, MessageSquare, Star, BadgeCheck, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface Provider {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  category: string;
  stage_fit: string[];
  logo_url: string | null;
  is_verified: boolean;
  rating: number;
  review_count: number;
}

// ============================================================================
// Category labels
// ============================================================================

const CATEGORY_LABELS: Record<string, string> = {
  legal: "Legal",
  finance: "Finance",
  marketing: "Marketing",
  growth: "Growth",
  tech: "Tech",
  hr: "HR",
  operations: "Operations",
  other: "Other",
};

const STAGE_OPTIONS = [
  { value: "all", label: "All Stages" },
  { value: "idea", label: "Idea" },
  { value: "validation", label: "Validation" },
  { value: "mvp", label: "MVP" },
  { value: "growth", label: "Growth" },
  { value: "scale", label: "Scale" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "legal", label: "Legal" },
  { value: "finance", label: "Finance" },
  { value: "marketing", label: "Marketing" },
  { value: "growth", label: "Growth" },
  { value: "tech", label: "Tech" },
  { value: "hr", label: "HR" },
  { value: "operations", label: "Operations" },
  { value: "other", label: "Other" },
];

// ============================================================================
// Star rating helper
// ============================================================================

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-3.5 w-3.5",
              i < full
                ? "fill-amber-400 text-amber-400"
                : i === full && half
                ? "fill-amber-200 text-amber-400"
                : "fill-none text-gray-300 dark:text-gray-600"
            )}
          />
        ))}
      </div>
      {count > 0 ? (
        <span className="text-xs text-muted-foreground">
          {rating.toFixed(1)} ({count})
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">New</span>
      )}
    </div>
  );
}

// ============================================================================
// Provider Card
// ============================================================================

function ProviderCard({ provider }: { provider: Provider }) {
  const categoryLabel = CATEGORY_LABELS[provider.category] ?? provider.category;

  return (
    <Link
      href={`/dashboard/marketplace/${provider.slug}`}
      className="no-underline block group"
    >
      <Card className="h-full overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-orange-500/30 dark:hover:border-orange-500/30">
        {/* Header with logo/avatar */}
        <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
          {provider.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={provider.logo_url}
              alt={provider.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="h-14 w-14 rounded-full bg-orange-500/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-orange-400">
                  {provider.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
          {/* Verified badge overlay */}
          {provider.is_verified && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                <BadgeCheck className="h-3 w-3 text-blue-400" />
                Verified
              </span>
            </div>
          )}
        </div>

        <CardHeader className="pb-2 pt-4 px-4">
          <h3 className="font-semibold text-base leading-tight group-hover:text-orange-500 transition-colors">
            {provider.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
            {provider.tagline}
          </p>
        </CardHeader>

        <CardContent className="px-4 pb-2">
          <StarRating rating={provider.rating} count={provider.review_count} />
        </CardContent>

        <CardFooter className="px-4 pb-4 flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="capitalize text-xs">
            {categoryLabel}
          </Badge>
          {provider.stage_fit.slice(0, 2).map((stage) => (
            <Badge key={stage} variant="outline" className="capitalize text-xs">
              {stage}
            </Badge>
          ))}
        </CardFooter>
      </Card>
    </Link>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function ProviderSkeleton() {
  return (
    <Card className="h-full overflow-hidden">
      <Skeleton className="h-32 w-full rounded-none" />
      <CardHeader className="pb-2 pt-4 px-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full mt-1" />
        <Skeleton className="h-4 w-5/6 mt-0.5" />
      </CardHeader>
      <CardContent className="px-4 pb-2">
        <Skeleton className="h-4 w-24" />
      </CardContent>
      <CardFooter className="px-4 pb-4 flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </CardFooter>
    </Card>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
        <ShoppingBag className="h-8 w-8 text-orange-400" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No providers yet</h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        Our service marketplace is being curated. Vetted service providers for founders will
        appear here soon.
      </p>
      <Button asChild variant="outline">
        <Link href="/chat" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Ask FRED to recommend a service provider
        </Link>
      </Button>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function MarketplacePage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [stage, setStage] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Debounce search input 400ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchProviders = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (stage !== "all") params.set("stage", stage);
    if (debouncedSearch) params.set("search", debouncedSearch);

    fetch(`/api/marketplace?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch providers");
        return r.json();
      })
      .then((data: { providers?: Provider[] }) => {
        setProviders(data.providers ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load providers");
        setLoading(false);
      });
  }, [category, stage, debouncedSearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- effect triggers fetchProviders, which manages loading/error state internally
    fetchProviders();
  }, [fetchProviders]);

  const hasFilters = category !== "all" || stage !== "all" || debouncedSearch !== "";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Service Marketplace</h1>
          <p className="text-muted-foreground mt-2">
            Vetted service providers to help your startup grow — legal, finance, marketing, and
            more.
          </p>
        </div>

        {/* Filter + search bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search providers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category filter */}
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stage filter */}
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              {STAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCategory("all");
                setStage("all");
                setSearch("");
              }}
            >
              Clear filters
            </Button>
          )}

          {/* My bookings link */}
          <Button asChild variant="outline" size="sm" className="ml-auto">
            <Link href="/dashboard/marketplace/bookings">My Bookings</Link>
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 mb-8 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Provider grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <ProviderSkeleton key={i} />)
          ) : providers.length === 0 ? (
            <EmptyState />
          ) : (
            providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
