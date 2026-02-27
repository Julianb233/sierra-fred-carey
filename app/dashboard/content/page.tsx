"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Lock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface Course {
  id: string;
  title: string;
  description: string;
  slug: string;
  thumbnail_url: string | null;
  stage: string | null;
  topic: string | null;
  tier_required: "free" | "pro" | "studio";
  is_published: boolean;
  sort_order: number;
}

// ============================================================================
// Helpers
// ============================================================================

function formatTierLabel(tier: string): string {
  if (tier === "studio") return "Studio";
  if (tier === "pro") return "Pro";
  return "";
}

// ============================================================================
// CourseCard (local component)
// ============================================================================

function CourseCard({ course }: { course: Course }) {
  const isGated = course.tier_required !== "free";

  return (
    <Link href={`/dashboard/content/${course.id}`} className="no-underline block group">
      <Card className="h-full overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-orange-500/30 dark:hover:border-orange-500/30">
        {/* Thumbnail */}
        <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800">
          {course.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen className="h-12 w-12 text-slate-400" />
            </div>
          )}
          {/* Tier badge overlay */}
          {isGated && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                <Lock className="h-3 w-3" />
                {formatTierLabel(course.tier_required)}
              </span>
            </div>
          )}
        </div>

        <CardHeader className="pb-2 pt-4 px-4">
          <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-orange-500 transition-colors">
            {course.title}
          </h3>
        </CardHeader>

        <CardContent className="px-4 pb-2">
          <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
        </CardContent>

        <CardFooter className="px-4 pb-4 flex items-center gap-2 flex-wrap">
          {course.stage && (
            <Badge variant="secondary" className="capitalize text-xs">
              {course.stage}
            </Badge>
          )}
          {course.topic && (
            <Badge variant="outline" className="capitalize text-xs">
              {course.topic}
            </Badge>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function CourseSkeleton() {
  return (
    <Card className="h-full overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <CardHeader className="pb-2 pt-4 px-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-1/2 mt-1" />
      </CardHeader>
      <CardContent className="px-4 pb-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6 mt-1" />
      </CardContent>
      <CardFooter className="px-4 pb-4 flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
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
        <BookOpen className="h-8 w-8 text-orange-400" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        Our course library is being built by expert founders and operators. Check back soon for
        curated video content designed for every stage of your journey.
      </p>
      <Button asChild variant="outline">
        <Link href="/chat" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Ask FRED for guidance in the meantime
        </Link>
      </Button>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function ContentLibraryPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<string>("all");
  const [topic, setTopic] = useState<string>("all");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    const params = new URLSearchParams();
    if (stage !== "all") params.set("stage", stage);
    if (topic !== "all") params.set("topic", topic);

    fetch(`/api/content?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch courses");
        return r.json();
      })
      .then((data) => {
        setCourses(data.courses ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load courses");
        setLoading(false);
      });
  }, [stage, topic]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Content Library</h1>
          <p className="text-muted-foreground mt-2">
            Learn from expert courses designed for founders at every stage of the journey.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className={cn("w-[160px]")}>
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="idea">Idea</SelectItem>
              <SelectItem value="validation">Validation</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
            </SelectContent>
          </Select>

          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger className={cn("w-[180px]")}>
              <SelectValue placeholder="All Topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              <SelectItem value="fundraising">Fundraising</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="legal">Legal</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
            </SelectContent>
          </Select>

          {(stage !== "all" || topic !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStage("all");
                setTopic("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 mb-8 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Course grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <CourseSkeleton key={i} />)
          ) : courses.length === 0 ? (
            <EmptyState />
          ) : (
            courses.map((course) => <CourseCard key={course.id} course={course} />)
          )}
        </div>
      </div>
    </div>
  );
}
