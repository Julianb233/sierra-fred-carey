/**
 * Service Marketplace DB helpers
 *
 * Provides typed query functions for the service marketplace tables.
 * Used by API routes in app/api/marketplace/ and by FRED's provider-recommender tool.
 *
 * Pattern: createServiceClient() used for all queries (service role bypasses RLS,
 * consistent with lib/db/content.ts pattern). Auth enforcement happens at API route layer.
 */
import { createServiceClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export interface ServiceProvider {
  id: string;
  user_id: string | null;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category:
    | "legal"
    | "finance"
    | "marketing"
    | "growth"
    | "tech"
    | "hr"
    | "operations"
    | "other";
  stage_fit: string[];
  logo_url: string | null;
  website: string | null;
  stripe_account_id: string | null;
  is_verified: boolean;
  is_active: boolean;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceListing {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  price_cents: number;
  price_type: "fixed" | "hourly" | "monthly" | "custom";
  deliverables: string[];
  turnaround_days: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  provider_id: string;
  listing_id: string | null;
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  message: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields (when queried with provider info)
  provider_name?: string;
  provider_slug?: string;
}

export interface ProviderReview {
  id: string;
  user_id: string;
  provider_id: string;
  booking_id: string | null;
  rating: number;
  review_text: string | null;
  created_at: string;
}

export interface CreateBookingInput {
  providerId: string;
  listingId?: string;
  message?: string;
  amountCents?: number;
}

export interface CreateReviewInput {
  providerId: string;
  bookingId?: string;
  rating: number;
  reviewText?: string;
}

// ============================================================================
// Provider queries
// ============================================================================

/**
 * Get active providers with optional filtering.
 * Used by GET /api/marketplace.
 */
export async function getProviders(filters?: {
  category?: string;
  stage?: string;
  search?: string;
}): Promise<ServiceProvider[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("service_providers")
    .select("*")
    .eq("is_active", true)
    .order("is_verified", { ascending: false })
    .order("rating", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  if (filters?.stage) {
    query = query.contains("stage_fit", [filters.stage]);
  }

  if (filters?.search) {
    const term = filters.search;
    query = query.or(
      `name.ilike.%${term}%,tagline.ilike.%${term}%,description.ilike.%${term}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as ServiceProvider[]) ?? [];
}

/**
 * Get a single provider by slug with their active listings and reviews.
 * Used by GET /api/marketplace/[slug].
 */
export async function getProvider(
  slug: string
): Promise<
  | (ServiceProvider & { listings: ServiceListing[]; reviews: ProviderReview[] })
  | null
> {
  const supabase = createServiceClient();

  const { data: provider, error: providerError } = await supabase
    .from("service_providers")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (providerError || !provider) return null;

  const { data: listings, error: listingsError } = await supabase
    .from("service_listings")
    .select("*")
    .eq("provider_id", provider.id)
    .eq("is_active", true)
    .order("price_cents", { ascending: true });

  if (listingsError) throw listingsError;

  const { data: reviews, error: reviewsError } = await supabase
    .from("provider_reviews")
    .select("*")
    .eq("provider_id", provider.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (reviewsError) throw reviewsError;

  return {
    ...(provider as ServiceProvider),
    listings: (listings as ServiceListing[]) ?? [],
    reviews: (reviews as ProviderReview[]) ?? [],
  };
}

// ============================================================================
// Booking queries
// ============================================================================

/**
 * Create a new booking.
 * Used by POST /api/marketplace/bookings.
 */
export async function createBooking(
  userId: string,
  data: CreateBookingInput
): Promise<Booking> {
  const supabase = createServiceClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      user_id: userId,
      provider_id: data.providerId,
      listing_id: data.listingId ?? null,
      message: data.message ?? null,
      amount_cents: data.amountCents ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return booking as Booking;
}

/**
 * Get all bookings for a user with provider info.
 * Used by GET /api/marketplace/bookings.
 */
export async function getUserBookings(userId: string): Promise<Booking[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      service_providers!provider_id (
        name,
        slug
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Flatten the joined provider fields
  return ((data as (Booking & { service_providers: { name: string; slug: string } | null })[]) ?? []).map(
    (row) => ({
      ...row,
      provider_name: row.service_providers?.name,
      provider_slug: row.service_providers?.slug,
      service_providers: undefined,
    })
  ) as Booking[];
}

// ============================================================================
// Review queries
// ============================================================================

/**
 * Create a review for a provider.
 * Validates that the booking exists and belongs to the user if bookingId provided.
 * Used by POST /api/marketplace/reviews.
 */
export async function createReview(
  userId: string,
  data: CreateReviewInput
): Promise<ProviderReview> {
  const supabase = createServiceClient();

  // If bookingId provided, validate it exists and belongs to this user
  if (data.bookingId) {
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("id", data.bookingId)
      .eq("user_id", userId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found or does not belong to this user");
    }
    if (booking.status !== "completed") {
      throw new Error("Can only review completed bookings");
    }
  }

  const { data: review, error } = await supabase
    .from("provider_reviews")
    .insert({
      user_id: userId,
      provider_id: data.providerId,
      booking_id: data.bookingId ?? null,
      rating: data.rating,
      review_text: data.reviewText ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return review as ProviderReview;
}

/**
 * Recalculate and update the average rating for a provider.
 * Called after createReview to keep the rating field current.
 * Used by POST /api/marketplace/reviews.
 */
export async function updateProviderRating(providerId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: reviews, error: reviewsError } = await supabase
    .from("provider_reviews")
    .select("rating")
    .eq("provider_id", providerId);

  if (reviewsError) throw reviewsError;

  const allReviews = reviews ?? [];
  const count = allReviews.length;
  const avg =
    count > 0
      ? allReviews.reduce(
          (sum: number, r: { rating: number }) => sum + r.rating,
          0
        ) / count
      : 0;

  const { error: updateError } = await supabase
    .from("service_providers")
    .update({
      rating: Math.round(avg * 100) / 100, // round to 2 decimal places
      review_count: count,
      updated_at: new Date().toISOString(),
    })
    .eq("id", providerId);

  if (updateError) throw updateError;
}
