"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Play, Clock, Lock, ChevronLeft, BookOpen, CheckCircle } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  sort_order: number;
  duration_seconds: number | null;
  mux_playback_id: string | null;
  mux_status: "pending" | "processing" | "ready" | "error";
  is_preview: boolean;
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string;
  sort_order: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  slug: string;
  thumbnail_url: string | null;
  stage: string | null;
  topic: string | null;
  tier_required: "free" | "pro" | "studio";
  modules: Module[];
}

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s > 0 ? `${s}s` : ""}`.trim();
}

function formatTotalDuration(modules: Module[]): string {
  const total = modules.flatMap((m) => m.lessons).reduce((acc, l) => acc + (l.duration_seconds ?? 0), 0);
  if (!total) return "";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
  return `${m}m`;
}

function getTotalLessons(modules: Module[]): number {
  return modules.reduce((acc, m) => acc + m.lessons.length, 0);
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function PageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Skeleton className="h-5 w-32" />
      <Card>
        <Skeleton className="h-48 w-full rounded-t-lg rounded-b-none" />
        <CardContent className="pt-6 space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Lesson Item
// ============================================================================

function LessonItem({
  lesson,
  courseId,
  isGated,
}: {
  lesson: Lesson;
  courseId: string;
  isGated: boolean;
}) {
  const isReady = lesson.mux_status === "ready" && !!lesson.mux_playback_id;
  const isLocked = isGated && !lesson.is_preview;

  const inner = (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
      <div className="shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center">
        {isLocked ? (
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        ) : isReady ? (
          <Play className="h-3.5 w-3.5 text-orange-500" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{lesson.title}</span>
        {lesson.description && (
          <span className="text-xs text-muted-foreground line-clamp-1">{lesson.description}</span>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {lesson.is_preview && (
          <Badge variant="secondary" className="text-xs">
            Preview
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">{formatDuration(lesson.duration_seconds)}</span>
      </div>
    </div>
  );

  if (isReady && !isLocked) {
    return (
      <Link href={`/dashboard/content/${courseId}/lessons/${lesson.id}`} className="block no-underline">
        {inner}
      </Link>
    );
  }

  return <div className="cursor-not-allowed opacity-70">{inner}</div>;
}

// ============================================================================
// Page
// ============================================================================

export default function CourseDetailPage() {
  const { courseId } = useParams() as { courseId: string };
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialize loading state before fetching course data
    setLoading(true);

    fetch(`/api/content/${courseId}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          setLoading(false);
          return null;
        }
        if (!r.ok) throw new Error("Failed to load course");
        return r.json();
      })
      .then((data) => {
        if (data) {
          setCourse(data.course);
        }
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [courseId]);

  if (loading) return <PageSkeleton />;

  if (notFound || !course) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/dashboard/content"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Content Library
        </Link>
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Course not found</h2>
          <p className="text-muted-foreground">This course may have been removed or is not yet published.</p>
        </div>
      </div>
    );
  }

  const isGated = course.tier_required !== "free";
  const totalLessons = getTotalLessons(course.modules);
  const totalDuration = formatTotalDuration(course.modules);
  const defaultOpen = course.modules.length > 0 ? [course.modules[0].id] : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/dashboard/content"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Content Library
        </Link>

        {/* Course header card */}
        <Card className="overflow-hidden mb-8">
          {/* Thumbnail banner */}
          <div className="relative h-48 w-full bg-gradient-to-br from-slate-700 to-slate-800 overflow-hidden">
            {course.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <BookOpen className="h-16 w-16 text-slate-400" />
              </div>
            )}
          </div>

          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold tracking-tight mb-2">{course.title}</h1>
                <p className="text-muted-foreground mb-4">{course.description}</p>

                {/* Meta row */}
                <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
                  {course.stage && (
                    <Badge variant="secondary" className="capitalize">
                      {course.stage}
                    </Badge>
                  )}
                  {course.topic && (
                    <Badge variant="outline" className="capitalize">
                      {course.topic}
                    </Badge>
                  )}
                  {isGated && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      {course.tier_required === "studio" ? "Studio" : "Pro"} tier
                    </Badge>
                  )}
                  {totalLessons > 0 && (
                    <span>{totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}</span>
                  )}
                  {totalDuration && <span>{totalDuration} total</span>}
                </div>
              </div>

              {/* Enroll button */}
              <div className="shrink-0">
                <Button
                  onClick={() => setEnrolled(true)}
                  disabled={enrolled}
                  className={
                    enrolled
                      ? "bg-green-600 hover:bg-green-600 text-white"
                      : "bg-orange-500 hover:bg-orange-600 text-white"
                  }
                >
                  {enrolled ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Enrolled
                    </>
                  ) : (
                    "Enroll Now"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Module accordion */}
        <Card>
          <CardHeader>
            <CardTitle>Course Content</CardTitle>
          </CardHeader>
          <CardContent>
            {course.modules.length === 0 ? (
              <div className="text-center py-10">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No lessons yet. Content is being prepared.</p>
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-2">
                {course.modules.map((module) => (
                  <AccordionItem
                    key={module.id}
                    value={module.id}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <span className="font-medium">{module.title}</span>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {module.lessons.length} {module.lessons.length === 1 ? "lesson" : "lessons"}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1 py-2">
                        {module.description && (
                          <p className="text-sm text-muted-foreground mb-3 pb-2 border-b">
                            {module.description}
                          </p>
                        )}
                        {module.lessons.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">No lessons in this module yet.</p>
                        ) : (
                          module.lessons.map((lesson) => (
                            <LessonItem
                              key={lesson.id}
                              lesson={lesson}
                              courseId={courseId}
                              isGated={isGated}
                            />
                          ))
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
