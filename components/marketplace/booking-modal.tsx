"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Loader2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface BookingModalListing {
  id: string;
  title: string;
  price_cents: number;
  price_type: "fixed" | "hourly" | "monthly" | "custom";
  turnaround_days: number | null;
}

export interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  providerName: string;
  listings: BookingModalListing[];
  /** Pre-select this listing on open */
  defaultListingId?: string;
}

// ============================================================================
// Price formatting
// ============================================================================

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

// ============================================================================
// Component
// ============================================================================

export function BookingModal({
  open,
  onOpenChange,
  providerId,
  providerName,
  listings,
  defaultListingId,
}: BookingModalProps) {
  const [selectedListingId, setSelectedListingId] = useState<string>(
    defaultListingId ?? listings[0]?.id ?? ""
  );
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedListing = listings.find((l) => l.id === selectedListingId);

  async function handleSubmit() {
    if (!providerId) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/marketplace/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          listingId: selectedListingId || undefined,
          message: message.trim() || undefined,
          amountCents: selectedListing?.price_cents,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit booking request");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose(val: boolean) {
    if (!val) {
      // Reset state on close
      setTimeout(() => {
        setSuccess(false);
        setError(null);
        setMessage("");
        setSelectedListingId(defaultListingId ?? listings[0]?.id ?? "");
      }, 200);
    }
    onOpenChange(val);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        {success ? (
          /* Success state */
          <div className="flex flex-col items-center py-8 text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Booking Request Sent!</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Your request has been sent to <strong>{providerName}</strong>. They&apos;ll
                review it and get back to you shortly.
              </p>
            </div>
            <Button onClick={() => handleClose(false)} className="mt-2">
              Done
            </Button>
          </div>
        ) : (
          /* Booking form */
          <>
            <DialogHeader>
              <DialogTitle>Book a Service</DialogTitle>
              <DialogDescription>
                Send a booking request to <strong>{providerName}</strong>. They will review and
                respond with next steps.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Service selection */}
              {listings.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="listing-select">Select Service</Label>
                  <Select
                    value={selectedListingId}
                    onValueChange={setSelectedListingId}
                  >
                    <SelectTrigger id="listing-select">
                      <SelectValue placeholder="Choose a service..." />
                    </SelectTrigger>
                    <SelectContent>
                      {listings.map((listing) => (
                        <SelectItem key={listing.id} value={listing.id}>
                          <span className="flex items-center justify-between gap-4 w-full">
                            <span>{listing.title}</span>
                            <span className="text-muted-foreground text-xs">
                              {formatPrice(listing.price_cents, listing.price_type)}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedListing && (
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(selectedListing.price_cents, selectedListing.price_type)}
                      {selectedListing.turnaround_days && (
                        <> &middot; {selectedListing.turnaround_days}-day turnaround</>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="booking-message">Message (optional)</Label>
                <Textarea
                  id="booking-message"
                  placeholder="Describe your project, timeline, or any specific requirements..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/1000
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Booking Request"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
