"use client";

/**
 * Share Button Component
 * Phase 33-01/02: Collaboration & Sharing
 *
 * Button that opens a share dialog with two modes:
 * - Public Link: Anyone with the link can view
 * - Share with Team: Only selected team members can view
 * Gated to Studio tier only.
 */

import { useState, useCallback, useEffect } from "react";
import { Share2, Copy, Check, Link2, Clock, Eye, X, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { UserTier, canAccessFeature, TIER_NAMES } from "@/lib/constants";
import { toast } from "sonner";
import type { ShareableResourceType } from "@/lib/sharing";

// ============================================================================
// Types
// ============================================================================

interface ShareButtonProps {
  /** The resource type to share */
  resourceType: ShareableResourceType;
  /** The UUID of the resource to share */
  resourceId: string;
  /** Current user's tier */
  tier: UserTier;
  /** Optional custom trigger label */
  label?: string;
  /** Optional className for the trigger button */
  className?: string;
}

interface ExpiryOption {
  label: string;
  hours: number | null;
}

interface TeamMemberOption {
  id: string;
  email: string;
  role: string;
}

type ShareMode = "public" | "team";

const EXPIRY_OPTIONS: ExpiryOption[] = [
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 168 },
  { label: "30 days", hours: 720 },
  { label: "Never", hours: null },
];

// ============================================================================
// Component
// ============================================================================

export function ShareButton({
  resourceType,
  resourceId,
  tier,
  label = "Share",
  className,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedExpiry, setSelectedExpiry] = useState<number | null>(168); // 7 days default

  // Team sharing state
  const [shareMode, setShareMode] = useState<ShareMode>("public");
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const isEnabled = canAccessFeature(tier, UserTier.STUDIO);

  // Fetch team members when switching to team mode
  useEffect(() => {
    if (shareMode !== "team" || !open) return;
    if (teamMembers.length > 0) return; // already loaded

    const fetchMembers = async () => {
      setLoadingMembers(true);
      try {
        const response = await fetch("/api/team?active=true");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.members) {
            setTeamMembers(data.members);
          }
        }
      } catch {
        // Silently fail
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [shareMode, open, teamMembers.length]);

  const toggleMember = useCallback((memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  }, []);

  const handleCreateLink = useCallback(async () => {
    if (shareMode === "team" && selectedMembers.length === 0) {
      toast.error("Select at least one team member");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        resourceType,
        resourceId,
        expiresIn: selectedExpiry,
      };

      if (shareMode === "team") {
        body.isTeamOnly = true;
        body.teamMemberIds = selectedMembers;
      }

      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || "Failed to create share link");
        return;
      }

      setShareUrl(data.shareUrl);
      toast.success(
        shareMode === "team"
          ? "Team share link created"
          : "Share link created"
      );
    } catch {
      toast.error("Failed to create share link");
    } finally {
      setLoading(false);
    }
  }, [resourceType, resourceId, selectedExpiry, shareMode, selectedMembers]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }, [shareUrl]);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Reset state when closing
    setTimeout(() => {
      setShareUrl(null);
      setCopied(false);
      setShareMode("public");
      setSelectedMembers([]);
    }, 200);
  }, []);

  if (!isEnabled) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className={className}
        title={`Sharing requires ${TIER_NAMES[UserTier.STUDIO]} tier`}
      >
        <Share2 className="h-4 w-4 mr-2" />
        {label}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Share2 className="h-4 w-4 mr-2" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[#ff6a1a]" />
            Create Shareable Link
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!shareUrl ? (
            <>
              {/* Sharing mode toggle */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Share mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShareMode("public")}
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      shareMode === "public"
                        ? "border-[#ff6a1a] bg-[#ff6a1a]/10 text-[#ff6a1a]"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Public Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareMode("team")}
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      shareMode === "team"
                        ? "border-[#ff6a1a] bg-[#ff6a1a]/10 text-[#ff6a1a]"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Share with Team
                  </button>
                </div>
              </div>

              {/* Team member selection (team mode only) */}
              {shareMode === "team" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    <Users className="h-3.5 w-3.5 inline mr-1.5" />
                    Select team members
                  </label>
                  {loadingMembers ? (
                    <div className="text-sm text-gray-500 py-3 text-center">
                      Loading team members...
                    </div>
                  ) : teamMembers.length === 0 ? (
                    <div className="text-sm text-gray-500 py-3 text-center border rounded-lg border-dashed">
                      No active team members. Invite members first.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {teamMembers.map((member) => (
                        <label
                          key={member.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedMembers.includes(member.id)}
                            onCheckedChange={() => toggleMember(member.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm truncate block">
                              {member.email}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 capitalize">
                            {member.role}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Expiry selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  <Clock className="h-3.5 w-3.5 inline mr-1.5" />
                  Link expires after
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {EXPIRY_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setSelectedExpiry(option.hours)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        selectedExpiry === option.hours
                          ? "border-[#ff6a1a] bg-[#ff6a1a]/10 text-[#ff6a1a]"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Create button */}
              <Button
                onClick={handleCreateLink}
                disabled={loading || (shareMode === "team" && selectedMembers.length === 0)}
                className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
              >
                {loading ? "Creating..." : shareMode === "team" ? "Share with Team" : "Create Link"}
              </Button>
            </>
          ) : (
            <>
              {/* Share URL display */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none truncate"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Info */}
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {shareMode === "team" ? (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    <span>Only selected team members can view this resource</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    <span>Anyone with this link can view this resource</span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4 mr-2" />
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
