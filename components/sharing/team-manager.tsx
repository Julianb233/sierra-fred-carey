"use client";

/**
 * Team Manager Component
 * Phase 33-01: Collaboration & Sharing
 *
 * Displays team members with invite functionality.
 * Gated to Studio tier via FeatureLock.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  Mail,
  Shield,
  Eye,
  Edit3,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FeatureLock } from "@/components/tier/feature-lock";
import { UserTier } from "@/lib/constants";
import { toast } from "sonner";
import type { TeamMember, TeamRole } from "@/lib/sharing/teams";

// ============================================================================
// Types
// ============================================================================

interface TeamManagerProps {
  /** Current user's tier */
  currentTier: UserTier;
}

// ============================================================================
// Constants
// ============================================================================

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

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  invited: {
    label: "Invited",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  active: {
    label: "Active",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  revoked: {
    label: "Revoked",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// Component
// ============================================================================

export function TeamManager({ currentTier }: TeamManagerProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("viewer");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Fetch team members
  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch("/api/team");
      const data = await response.json();
      if (data.success) {
        setMembers(data.members);
      }
    } catch {
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Invite handler
  const handleInvite = useCallback(async () => {
    if (!inviteEmail || !EMAIL_REGEX.test(inviteEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setInviting(true);
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || "Failed to invite member");
        return;
      }

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      fetchMembers();
    } catch {
      toast.error("Failed to invite member");
    } finally {
      setInviting(false);
    }
  }, [inviteEmail, inviteRole, fetchMembers]);

  // Remove handler
  const handleRemove = useCallback(
    async (memberId: string) => {
      setRemovingId(memberId);
      try {
        const response = await fetch(`/api/team?id=${memberId}`, {
          method: "DELETE",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          toast.error(data.error || "Failed to remove member");
          return;
        }

        toast.success("Member removed");
        fetchMembers();
      } catch {
        toast.error("Failed to remove member");
      } finally {
        setRemovingId(null);
      }
    },
    [fetchMembers]
  );

  // Role update handler
  const handleRoleUpdate = useCallback(
    async (memberId: string, newRole: TeamRole) => {
      try {
        const response = await fetch("/api/team", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId, role: newRole }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          toast.error(data.error || "Failed to update role");
          return;
        }

        toast.success("Role updated");
        fetchMembers();
      } catch {
        toast.error("Failed to update role");
      }
    },
    [fetchMembers]
  );

  // Filter out revoked members for display (show active + invited)
  const visibleMembers = members.filter((m) => m.status !== "revoked");

  return (
    <FeatureLock
      requiredTier={UserTier.STUDIO}
      currentTier={currentTier}
      featureName="Team Collaboration"
      description="Invite co-founders and advisors to collaborate on your startup journey."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#ff6a1a]" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Team Members
            </h3>
            <Badge variant="secondary" className="ml-1">
              {visibleMembers.length}/5
            </Badge>
          </div>
        </div>

        {/* Invite form */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="email"
              placeholder="Enter email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              className="pl-10"
            />
          </div>
          <Select
            value={inviteRole}
            onValueChange={(val) => setInviteRole(val as TeamRole)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="collaborator">Collaborator</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail}
            className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shrink-0"
          >
            {inviting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Invite</span>
          </Button>
        </div>

        {/* Members list */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : visibleMembers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No team members yet. Invite your first collaborator above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleMembers.map((member) => {
              const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.viewer;
              const statusConfig =
                STATUS_CONFIG[member.status] || STATUS_CONFIG.invited;
              const RoleIcon = roleConfig.icon;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                      <RoleIcon className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {member.member_email}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${roleConfig.className}`}
                        >
                          {roleConfig.label}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${statusConfig.className}`}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Role selector */}
                    <Select
                      value={member.role}
                      onValueChange={(val) =>
                        handleRoleUpdate(member.id, val as TeamRole)
                      }
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="collaborator">Collaborator</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Remove button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(member.id)}
                      disabled={removingId === member.id}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      {removingId === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FeatureLock>
  );
}
