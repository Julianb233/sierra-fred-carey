"use client";

/**
 * Team Invitations Page
 * Phase 33-01: Collaboration & Sharing
 *
 * Shows pending team invitations for the current user with accept/decline actions.
 */

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Mail,
  Check,
  X,
  Loader2,
  Shield,
  Eye,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import type { TeamMember, TeamRole } from "@/lib/sharing/teams";

// ============================================================================
// Types
// ============================================================================

type PageState = "loading" | "loaded" | "error" | "empty";

const ROLE_CONFIG: Record<
  TeamRole,
  { label: string; icon: typeof Eye; className: string }
> = {
  viewer: {
    label: "Viewer",
    icon: Eye,
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  collaborator: {
    label: "Collaborator",
    icon: Edit3,
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    className:
      "bg-[#ff6a1a]/10 text-[#ff6a1a] dark:bg-[#ff6a1a]/20 dark:text-orange-400",
  },
};

// ============================================================================
// Page Component
// ============================================================================

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<TeamMember[]>([]);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch pending invitations
  const fetchInvitations = useCallback(async () => {
    try {
      setPageState("loading");
      const res = await fetch("/api/team/invitations");

      if (!res.ok) {
        throw new Error("Failed to fetch invitations");
      }

      const data = await res.json();

      if (data.success && data.invitations) {
        setInvitations(data.invitations);
        setPageState(data.invitations.length === 0 ? "empty" : "loaded");
      } else {
        setPageState("empty");
      }
    } catch {
      setPageState("error");
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // Accept handler
  const handleAccept = useCallback(
    async (inviteId: string) => {
      setProcessingId(inviteId);
      try {
        const res = await fetch("/api/team/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteId }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.error || "Failed to accept invitation");
          return;
        }

        toast.success("Invitation accepted! You are now a team member.");
        // Remove from local list
        setInvitations((prev) => prev.filter((inv) => inv.id !== inviteId));
        // Check if list is now empty
        setInvitations((prev) => {
          if (prev.length === 0) setPageState("empty");
          return prev;
        });
      } catch {
        toast.error("Failed to accept invitation");
      } finally {
        setProcessingId(null);
      }
    },
    []
  );

  // Decline handler
  const handleDecline = useCallback(
    async (inviteId: string) => {
      setProcessingId(inviteId);
      try {
        const res = await fetch(`/api/team/invitations?id=${inviteId}`, {
          method: "DELETE",
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.error || "Failed to decline invitation");
          return;
        }

        toast.success("Invitation declined.");
        setInvitations((prev) => prev.filter((inv) => inv.id !== inviteId));
        setInvitations((prev) => {
          if (prev.length === 0) setPageState("empty");
          return prev;
        });
      } catch {
        toast.error("Failed to decline invitation");
      } finally {
        setProcessingId(null);
      }
    },
    []
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Mail className="h-7 w-7 text-[#ff6a1a]" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Team Invitations
        </h1>
        {invitations.length > 0 && (
          <Badge className="bg-[#ff6a1a] text-white text-xs">
            {invitations.length} pending
          </Badge>
        )}
      </div>
      <p className="text-gray-500 dark:text-gray-400">
        Review and manage team invitations from other founders.
      </p>

      {/* Content */}
      {pageState === "loading" && <LoadingSkeleton />}

      {pageState === "error" && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Something went wrong loading your invitations.
          </p>
          <Button onClick={fetchInvitations} variant="outline">
            Retry
          </Button>
        </div>
      )}

      {pageState === "empty" && <EmptyState />}

      {pageState === "loaded" && (
        <div className="space-y-3">
          {invitations.map((invitation) => {
            const roleConfig =
              ROLE_CONFIG[invitation.role] || ROLE_CONFIG.viewer;
            const RoleIcon = roleConfig.icon;
            const isProcessing = processingId === invitation.id;

            return (
              <div
                key={invitation.id}
                className="border rounded-lg p-4 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#ff6a1a]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Users className="h-5 w-5 text-[#ff6a1a]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Team invitation from{" "}
                        <span className="text-[#ff6a1a]">
                          {invitation.owner_user_id}
                        </span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${roleConfig.className}`}
                        >
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {roleConfig.label}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(invitation.invited_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(invitation.id)}
                      disabled={isProcessing}
                      className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      <span className="ml-1.5 hidden sm:inline">Accept</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(invitation.id)}
                      disabled={isProcessing}
                      className="text-gray-500 hover:text-red-600 hover:border-red-300"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      <span className="ml-1.5 hidden sm:inline">Decline</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="border rounded-lg p-4 border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
        <Mail className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        No pending invitations
      </h3>
      <p className="text-gray-500 dark:text-gray-400">
        When someone invites you to their team, it will appear here.
      </p>
    </div>
  );
}
