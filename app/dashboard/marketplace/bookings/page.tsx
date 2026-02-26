"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ShoppingBag, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface Booking {
  id: string;
  provider_id: string;
  listing_id: string | null;
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  message: string | null;
  created_at: string;
  provider_name?: string;
  provider_slug?: string;
}

// ============================================================================
// Status config
// ============================================================================

const STATUS_CONFIG: Record<
  Booking["status"],
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: {
    label: "Pending",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-700",
    icon: Clock,
  },
  accepted: {
    label: "Accepted",
    color:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700",
    icon: CheckCircle2,
  },
  completed: {
    label: "Completed",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color:
      "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    color:
      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
    icon: XCircle,
  },
};

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ============================================================================
// Booking Row
// ============================================================================

function BookingRow({ booking }: { booking: Booking }) {
  const config = STATUS_CONFIG[booking.status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="shrink-0 h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
        <ShoppingBag className="h-5 w-5 text-orange-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            {booking.provider_slug ? (
              <Link
                href={`/dashboard/marketplace/${booking.provider_slug}`}
                className="font-medium text-sm hover:text-orange-500 transition-colors"
              >
                {booking.provider_name ?? "Provider"}
              </Link>
            ) : (
              <span className="font-medium text-sm">{booking.provider_name ?? "Provider"}</span>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              Requested {formatDate(booking.created_at)}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
              config.color
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </span>
        </div>
        {booking.message && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2 italic">
            &ldquo;{booking.message}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function BookingSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full shrink-0" />
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8 text-orange-400" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        Browse the marketplace and send a booking request to get started with a service provider.
      </p>
      <Button asChild variant="outline">
        <Link href="/dashboard/marketplace">Browse Marketplace</Link>
      </Button>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/marketplace/bookings")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch bookings");
        return r.json();
      })
      .then((data: { bookings?: Booking[] }) => {
        setBookings(data.bookings ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load bookings");
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background py-2">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
          <p className="text-muted-foreground mt-2">
            Track the status of your service provider booking requests.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 mb-6 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <BookingSkeleton key={i} />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {/* Status filter summary */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(["pending", "accepted", "completed", "rejected", "cancelled"] as const).map(
                (status) => {
                  const count = bookings.filter((b) => b.status === status).length;
                  if (count === 0) return null;
                  const config = STATUS_CONFIG[status];
                  return (
                    <Badge
                      key={status}
                      variant="outline"
                      className={cn("text-xs gap-1", config.color)}
                    >
                      {config.label}: {count}
                    </Badge>
                  );
                }
              )}
            </div>
            {bookings.map((booking) => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
