"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { BookingModal } from "@/components/marketplace/booking-modal";
import type { BookingModalListing } from "@/components/marketplace/booking-modal";
import {
  ArrowLeft,
  BadgeCheck,
  Star,
  ExternalLink,
  Clock,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types (mirroring lib/db/marketplace.ts shapes)
// ============================================================================

interface ServiceListing {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  price_type: "fixed" | "hourly" | "monthly" | "custom";
  deliverables: string[];
  turnaround_days: number | null;
  is_active: boolean;
}

interface ProviderReview {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

interface ProviderDetail {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  stage_fit: string[];
  logo_url: string | null;
  website: string | null;
  is_verified: boolean;
  rating: number;
  review_count: number;
  listings: ServiceListing[];
  reviews: ProviderReview[];
}

// ============================================================================
// Helpers
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

function formatPrice(cents: number, type: string): string {
  const dollars = (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  if (type === "hourly") return `${dollars}/hr`;
  if (type === "monthly") return `${dollars}/mo`;
  if (type === "custom") return "Custom pricing";
  return dollars;
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
              i < full
                ? "fill-amber-400 text-amber-400"
                : i === full && half
                ? "fill-amber-200 text-amber-400"
                : "fill-none text-gray-300 dark:text-gray-600"
            )}
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        {count > 0 ? `${rating.toFixed(1)} (${count} review${count !== 1 ? "s" : ""})` : "No reviews yet"}
      </span>
    </div>
  );
}

function formatReviewDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function DetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Skeleton className="h-6 w-24" />
      <div className="flex gap-6 items-start">
        <Skeleton className="h-20 w-20 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function ProviderDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [defaultListingId, setDefaultListingId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!slug) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/marketplace/${slug}`)
      .then((r) => {
        if (r.status === 404) throw new Error("Provider not found");
        if (!r.ok) throw new Error("Failed to fetch provider");
        return r.json();
      })
      .then((data: { provider?: ProviderDetail }) => {
        setProvider(data.provider ?? null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load provider");
        setLoading(false);
      });
  }, [slug]);

  function openBookingModal(listingId?: string) {
    setDefaultListingId(listingId);
    setBookingOpen(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-2">
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen bg-background py-2">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/dashboard/marketplace"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </Link>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {error === "Provider not found" ? "Provider Not Found" : "Something went wrong"}
            </h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button asChild variant="outline">
              <Link href="/dashboard/marketplace">Browse Marketplace</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const bookingListings: BookingModalListing[] = provider.listings.map((l) => ({
    id: l.id,
    title: l.title,
    price_cents: l.price_cents,
    price_type: l.price_type,
    turnaround_days: l.turnaround_days,
  }));

  return (
    <div className="min-h-screen bg-background py-2">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>

        {/* Provider Header */}
        <div className="flex flex-col sm:flex-row gap-6 items-start mb-8">
          {/* Logo / Avatar */}
          <div className="shrink-0 h-20 w-20 rounded-full overflow-hidden border-2 border-border bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
            {provider.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={provider.logo_url}
                alt={provider.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-orange-400">
                {provider.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-bold">{provider.name}</h1>
              {provider.is_verified && (
                <span className="inline-flex items-center gap-1 text-sm text-blue-500">
                  <BadgeCheck className="h-4 w-4" />
                  Verified
                </span>
              )}
            </div>
            <p className="text-muted-foreground mb-3">{provider.tagline}</p>
            <div className="flex flex-wrap items-center gap-3">
              <StarRating rating={provider.rating} count={provider.review_count} />
              <Badge variant="secondary" className="capitalize">
                {CATEGORY_LABELS[provider.category] ?? provider.category}
              </Badge>
              {provider.stage_fit.map((s) => (
                <Badge key={s} variant="outline" className="capitalize">
                  {s}
                </Badge>
              ))}
              {provider.website && (
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-orange-500 hover:underline"
                >
                  Website
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="shrink-0">
            <Button
              onClick={() => openBookingModal()}
              disabled={provider.listings.length === 0}
              size="lg"
            >
              Book This Service
            </Button>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Description */}
        {provider.description && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">About</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {provider.description}
            </p>
          </section>
        )}

        {/* Service Listings */}
        {provider.listings.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Services</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {provider.listings.map((listing) => (
                <Card
                  key={listing.id}
                  className="border hover:border-orange-500/40 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-base leading-tight">{listing.title}</h3>
                      <span className="shrink-0 text-sm font-semibold text-orange-500">
                        {formatPrice(listing.price_cents, listing.price_type)}
                      </span>
                    </div>
                    {listing.turnaround_days && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {listing.turnaround_days}-day turnaround
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <p className="text-sm text-muted-foreground">{listing.description}</p>
                    {listing.deliverables.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-1.5">Deliverables:</p>
                        <ul className="space-y-1">
                          {listing.deliverables.map((d, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => openBookingModal(listing.id)}
                    >
                      Book Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Reviews
            {provider.review_count > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({provider.review_count})
              </span>
            )}
          </h2>
          {provider.reviews.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No reviews yet. Be the first to work with {provider.name}!
            </p>
          ) : (
            <div className="space-y-4">
              {provider.reviews.map((review) => (
                <div
                  key={review.id}
                  className="border rounded-lg p-4 bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-3.5 w-3.5",
                            i < review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "fill-none text-gray-300 dark:text-gray-600"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatReviewDate(review.created_at)}
                    </span>
                  </div>
                  {review.review_text && (
                    <p className="text-sm text-muted-foreground">{review.review_text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Booking Modal */}
      {provider && (
        <BookingModal
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          providerId={provider.id}
          providerName={provider.name}
          listings={bookingListings}
          defaultListingId={defaultListingId}
        />
      )}
    </div>
  );
}
