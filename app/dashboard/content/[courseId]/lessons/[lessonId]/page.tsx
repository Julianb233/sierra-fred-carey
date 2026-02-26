"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import MuxPlayer from "@mux/mux-player-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Clock, Lock, ChevronLeft, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface PlaybackTokenResponse {
  token: string;
  playbackId: string;
}

interface LessonNav {
  id: string;
  title: string;
  sort_order: number;
  mux_status: "pending" | "processing" | "ready" | "error";
  is_preview: boolean;
  duration_seconds: number | null;
}

interface ModuleNav {
  id: string;
  title: string;
  sort_order: number;
  lessons: LessonNav[];
}

interface CourseNav {
  id: string;
  title: string;
  tier_required: "free" | "pro" | "studio";
  modules: ModuleNav[];
}

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m${s > 0 ? ` ${s}s` : ""}`;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function PageSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex-1 space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="aspect-video w-full rounded-lg" />
      </div>
      <div className="w-full lg:w-72 space-y-3">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Upgrade Prompt
// ============================================================================

function UpgradePrompt({ tier }: { tier: string }) {
  return (
    <div className="aspect-video w-full rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center text-center p-8">
      <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
        <Lock className="h-8 w-8 text-orange-400" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-white">Upgrade Required</h3>
      <p className="text-slate-400 mb-6 max-w-sm">
        This lesson requires a{" "}
        <span className="text-white font-medium capitalize">{tier}</span> subscription to watch.
      </p>
      <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
        <Link href="/pricing">Upgrade Now</Link>
      </Button>
    </div>
  );
}

// ============================================================================
// Sidebar Lesson Item
// ============================================================================

function SidebarLesson({
  lesson,
  courseId,
  isCurrentLesson,
}: {
  lesson: LessonNav;
  courseId: string;
  isCurrentLesson: boolean;
}) {
  const isReady = lesson.mux_status === "ready";

  return (
    <Link
      href={`/dashboard/content/${courseId}/lessons/${lesson.id}`}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors no-underline",
        isCurrentLesson
          ? "bg-orange-500/10 border-l-2 border-orange-500 text-foreground"
          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
      )}
    >
      <div className="shrink-0 h-6 w-6 rounded-full bg-muted flex items-center justify-center">
        {isReady ? (
          <Play className="h-3 w-3 text-orange-500" />
        ) : (
          <Clock className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
      <span className="flex-1 truncate">{lesson.title}</span>
      {lesson.duration_seconds && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDuration(lesson.duration_seconds)}
        </span>
      )}
    </Link>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function LessonPage() {
  const { courseId, lessonId } = useParams() as { courseId: string; lessonId: string };

  const [tokenData, setTokenData] = useState<PlaybackTokenResponse | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [upgradeTier, setUpgradeTier] = useState("Pro");
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseNav | null>(null);
  const [currentLesson, setCurrentLesson] = useState<LessonNav | null>(null);

  // Track which progress milestones have been reported this session
  const reportedMilestones = useRef<Set<number>>(new Set());

  // Reset milestones when lesson changes
  useEffect(() => {
    reportedMilestones.current = new Set();
  }, [lessonId]);

  // Fetch course nav + playback token in parallel
  useEffect(() => {
    if (!courseId || !lessonId) return;

    setLoading(true);
    setTokenData(null);
    setTokenError(null);
    setUpgradeRequired(false);

    const fetchCourse = fetch(`/api/content/${courseId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const c = data.course as CourseNav;
        setCourse(c);
        // Find current lesson in modules
        for (const mod of c.modules) {
          const found = mod.lessons.find((l) => l.id === lessonId);
          if (found) {
            setCurrentLesson(found);
            break;
          }
        }
      })
      .catch(() => {});

    const fetchToken = fetch(`/api/content/${courseId}/lessons/${lessonId}/playback-token`)
      .then(async (r) => {
        if (r.status === 403) {
          const body = await r.json().catch(() => ({})) as { upgradeUrl?: string };
          setUpgradeRequired(true);
          setUpgradeTier(course?.tier_required === "studio" ? "Studio" : "Pro");
          void body;
          return;
        }
        if (!r.ok) {
          const body = await r.json().catch(() => ({})) as { error?: string };
          setTokenError(body.error ?? "Failed to load video");
          return;
        }
        const data = await r.json() as PlaybackTokenResponse;
        setTokenData(data);
      })
      .catch(() => {
        setTokenError("Failed to load video. Please try again.");
      });

    Promise.all([fetchCourse, fetchToken]).finally(() => {
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, lessonId]);

  // Save progress at 25/50/75/100% milestones (fire-and-forget)
  const saveProgress = useCallback(
    (watchedPct: number) => {
      if (reportedMilestones.current.has(watchedPct)) return;
      reportedMilestones.current.add(watchedPct);
      fetch("/api/content/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          watchedPct,
          completed: watchedPct === 100,
        }),
      }).catch(() => {});
    },
    [lessonId]
  );

  const handleTimeUpdate = useCallback(
    // MuxPlayer's onTimeUpdate receives a CustomEvent; target is the mux-player element
    // which has currentTime and duration as properties
    (evt: Event) => {
      const target = evt.target as HTMLVideoElement | null;
      if (!target) return;
      const { currentTime, duration } = target;
      if (!duration || duration === 0) return;
      const pct = Math.floor((currentTime / duration) * 100);
      [25, 50, 75, 100].forEach((m) => {
        if (pct >= m) saveProgress(m);
      });
    },
    [saveProgress]
  );

  if (loading) return <PageSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back link */}
        <Link
          href={`/dashboard/content/${courseId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {course?.title ?? "Back to Course"}
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main video area */}
          <div className="flex-1 min-w-0">
            {/* Lesson title */}
            {currentLesson && (
              <div className="mb-4">
                <h1 className="text-xl font-semibold">{currentLesson.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  {currentLesson.is_preview && (
                    <Badge variant="secondary" className="text-xs">Preview</Badge>
                  )}
                  {currentLesson.duration_seconds && (
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(currentLesson.duration_seconds)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Video / Error / Upgrade states */}
            {upgradeRequired ? (
              <UpgradePrompt tier={upgradeTier} />
            ) : tokenError ? (
              <div className="aspect-video w-full rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center text-center p-8">
                <BookOpen className="h-12 w-12 text-slate-500 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Video unavailable</h3>
                <p className="text-slate-400 text-sm mb-4">{tokenError}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Try again
                </Button>
              </div>
            ) : tokenData ? (
              <MuxPlayer
                playbackId={tokenData.playbackId}
                tokens={{ playback: tokenData.token }}
                className="w-full rounded-lg aspect-video"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onTimeUpdate={handleTimeUpdate as any}
              />
            ) : (
              <div className="aspect-video w-full rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <Skeleton className="w-full h-full rounded-lg" />
              </div>
            )}
          </div>

          {/* Lesson sidebar */}
          <aside className="w-full lg:w-72 shrink-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Course Lessons</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {!course || course.modules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No lessons available yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {course.modules.map((mod) => (
                      <div key={mod.id}>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 mb-1">
                          {mod.title}
                        </p>
                        <div className="space-y-0.5">
                          {mod.lessons.map((lesson) => (
                            <SidebarLesson
                              key={lesson.id}
                              lesson={lesson}
                              courseId={courseId}
                              isCurrentLesson={lesson.id === lessonId}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
