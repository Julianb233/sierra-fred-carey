/**
 * Content library DB helpers
 *
 * Provides typed query functions for the content library tables.
 * Used by API routes in app/api/content/ and app/api/admin/content/,
 * and by FRED's content-recommender tool.
 */
import { createServiceClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export interface Course {
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
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string;
  sort_order: number;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  sort_order: number;
  duration_seconds: number | null;
  mux_upload_id: string | null;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  mux_status: "pending" | "processing" | "ready" | "error";
  is_preview: boolean;
}

export interface ContentProgress {
  user_id: string;
  lesson_id: string;
  watched_pct: number;
  completed: boolean;
  last_watched: string;
}

// ============================================================================
// Catalog queries
// ============================================================================

/**
 * Get published course catalog with optional filtering.
 * Used by GET /api/content (public catalog endpoint).
 * Does NOT filter by tier — returns all published courses with tier_required field
 * so frontend can show upgrade prompts. Actual video is gated at playback-token endpoint.
 */
export async function getCatalog(filters: {
  stage?: string | null;
  topic?: string | null;
}): Promise<Course[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("courses")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (filters.stage) query = query.eq("stage", filters.stage);
  if (filters.topic) query = query.eq("topic", filters.topic);

  const { data, error } = await query;
  if (error) throw error;
  return (data as Course[]) ?? [];
}

/**
 * Get a single course with its modules and lessons.
 * Used by GET /api/content/[courseId].
 */
export async function getCourse(
  courseId: string
): Promise<(Course & { modules: (Module & { lessons: Lesson[] })[] }) | null> {
  const supabase = createServiceClient();

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .eq("is_published", true)
    .single();

  if (courseError || !course) return null;

  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (modulesError) throw modulesError;

  const moduleIds = (modules ?? []).map((m: Module) => m.id);
  let lessons: Lesson[] = [];

  if (moduleIds.length > 0) {
    const { data: lessonData, error: lessonsError } = await supabase
      .from("lessons")
      .select("*")
      .in("module_id", moduleIds)
      .order("sort_order", { ascending: true });

    if (lessonsError) throw lessonsError;
    lessons = (lessonData as Lesson[]) ?? [];
  }

  const modulesWithLessons = (modules ?? []).map((m: Module) => ({
    ...m,
    lessons: lessons.filter((l) => l.module_id === m.id),
  }));

  return { ...(course as Course), modules: modulesWithLessons };
}

/**
 * Get a single lesson by ID.
 * Used by GET /api/content/[courseId]/lessons/[lessonId]/playback-token.
 */
export async function getLesson(lessonId: string): Promise<Lesson | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .single();

  if (error || !data) return null;
  return data as Lesson;
}

/**
 * Search content library by query text and optional filters.
 * Used by FRED's content-recommender tool (lib/fred/tools/content-recommender.ts).
 * Searches title and description fields with ilike (case-insensitive).
 */
export async function searchContentLibrary(params: {
  query: string;
  stage?: string | null;
  format?: "video" | "article" | "course" | "any";
}): Promise<Course[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("courses")
    .select("*")
    .eq("is_published", true)
    .or(`title.ilike.%${params.query}%,description.ilike.%${params.query}%`)
    .order("sort_order", { ascending: true })
    .limit(5);

  if (params.stage) query = query.eq("stage", params.stage);

  const { data, error } = await query;
  if (error) throw error;
  return (data as Course[]) ?? [];
}

// ============================================================================
// Progress tracking
// ============================================================================

/**
 * Upsert lesson progress for a user.
 * Called by POST /api/content/progress (from Mux Player progress events in Phase 67).
 */
export async function upsertProgress(params: {
  userId: string;
  lessonId: string;
  watchedPct: number;
  completed: boolean;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("content_progress").upsert(
    {
      user_id: params.userId,
      lesson_id: params.lessonId,
      watched_pct: params.watchedPct,
      completed: params.completed,
      last_watched: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" }
  );
  if (error) throw error;
}

// ============================================================================
// Admin queries (used by admin API routes)
// ============================================================================

/**
 * Get all courses (published and unpublished) for admin listing.
 */
export async function adminGetCourses(): Promise<Course[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Course[]) ?? [];
}

/**
 * Create a new course.
 */
export async function adminCreateCourse(input: {
  title: string;
  description: string;
  slug: string;
  stage?: string | null;
  topic?: string | null;
  thumbnail_url?: string | null;
  tier_required: "free" | "pro" | "studio";
}): Promise<Course> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({
      ...input,
      is_published: false,
      sort_order: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Course;
}

/**
 * Update a course (partial update).
 */
export async function adminUpdateCourse(
  courseId: string,
  updates: Partial<Omit<Course, "id" | "created_at">>
): Promise<Course> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("courses")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", courseId)
    .select()
    .single();
  if (error) throw error;
  return data as Course;
}

/**
 * Create a module for a course.
 */
export async function adminCreateModule(input: {
  course_id: string;
  title: string;
  description?: string;
  sort_order?: number;
}): Promise<Module> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("modules")
    .insert({
      ...input,
      description: input.description ?? "",
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Module;
}

/**
 * Create a lesson for a module.
 */
export async function adminCreateLesson(input: {
  module_id: string;
  title: string;
  description?: string;
  sort_order?: number;
  is_preview?: boolean;
}): Promise<Lesson> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      ...input,
      description: input.description ?? "",
      sort_order: input.sort_order ?? 0,
      is_preview: input.is_preview ?? false,
      mux_status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data as Lesson;
}

/**
 * Update lesson mux fields (called by webhook handler).
 */
export async function updateLessonMuxFields(
  lessonId: string,
  fields: {
    mux_asset_id?: string;
    mux_playback_id?: string;
    mux_status?: "pending" | "processing" | "ready" | "error";
    duration_seconds?: number;
    mux_upload_id?: string;
  }
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("lessons")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", lessonId);
  if (error) throw error;
}

/**
 * Find a lesson by mux_upload_id (fallback for webhook when passthrough is missing).
 */
export async function getLessonByUploadId(
  uploadId: string
): Promise<Lesson | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("mux_upload_id", uploadId)
    .single();
  if (error || !data) return null;
  return data as Lesson;
}
