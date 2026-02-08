/**
 * Team Management Module
 * Phase 33-01: Collaboration & Sharing
 *
 * Provides CRUD operations for team member invitations and management.
 * Uses createClient for user-scoped operations, createServiceClient
 * for cross-user lookups (e.g. accepting invites by email).
 */

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface TeamMember {
  id: string;
  owner_user_id: string;
  member_email: string;
  member_user_id: string | null;
  role: TeamRole;
  status: TeamMemberStatus;
  invited_at: string;
  accepted_at: string | null;
}

export type TeamRole = "viewer" | "collaborator" | "admin";
export type TeamMemberStatus = "invited" | "active" | "revoked";

const VALID_ROLES: TeamRole[] = ["viewer", "collaborator", "admin"];
const MAX_TEAM_MEMBERS = 5;

const log = logger.child({ module: "teams" });

// ============================================================================
// Validation
// ============================================================================

export function isValidTeamRole(role: string): role is TeamRole {
  return VALID_ROLES.includes(role as TeamRole);
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Invite a team member by email.
 * Enforces maximum team size of 5 active/invited members.
 * Uses user-scoped client (RLS ensures ownership).
 */
export async function inviteTeamMember(
  ownerUserId: string,
  email: string,
  role: TeamRole = "viewer"
): Promise<TeamMember> {
  const supabase = await createClient();

  // Check existing member count (only non-revoked)
  const { data: existing, error: countError } = await supabase
    .from("team_members")
    .select("id")
    .eq("owner_user_id", ownerUserId)
    .in("status", ["invited", "active"]);

  if (countError) {
    log.error("Failed to count team members", { error: countError, ownerUserId });
    throw new Error("Failed to check team capacity");
  }

  if ((existing || []).length >= MAX_TEAM_MEMBERS) {
    throw new Error(
      `Maximum team size of ${MAX_TEAM_MEMBERS} members reached. Remove a member before inviting a new one.`
    );
  }

  // Check for duplicate invite (including revoked - allow re-invite)
  const { data: existingMember } = await supabase
    .from("team_members")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .eq("member_email", email.toLowerCase())
    .single();

  if (existingMember) {
    const member = existingMember as TeamMember;
    if (member.status === "revoked") {
      // Re-invite revoked member
      const { data: updated, error: updateError } = await supabase
        .from("team_members")
        .update({
          role,
          status: "invited",
          invited_at: new Date().toISOString(),
          accepted_at: null,
        })
        .eq("id", member.id)
        .eq("owner_user_id", ownerUserId)
        .select()
        .single();

      if (updateError || !updated) {
        throw new Error("Failed to re-invite team member");
      }

      log.info("Team member re-invited", {
        memberId: member.id,
        email,
        ownerUserId,
      });
      return updated as TeamMember;
    }

    throw new Error("This email has already been invited");
  }

  const { data, error } = await supabase
    .from("team_members")
    .insert({
      owner_user_id: ownerUserId,
      member_email: email.toLowerCase(),
      role,
      status: "invited",
    })
    .select()
    .single();

  if (error || !data) {
    log.error("Failed to invite team member", { error, ownerUserId, email });
    throw new Error("Failed to invite team member");
  }

  log.info("Team member invited", {
    memberId: data.id,
    email,
    role,
    ownerUserId,
  });

  return data as TeamMember;
}

/**
 * List all team members for an owner.
 * Uses user-scoped client (RLS filters automatically).
 */
export async function getTeamMembers(
  ownerUserId: string
): Promise<TeamMember[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("invited_at", { ascending: false });

  if (error) {
    log.error("Failed to fetch team members", { error, ownerUserId });
    return [];
  }

  return (data || []) as TeamMember[];
}

/**
 * Remove a team member by setting status to 'revoked'.
 * Uses user-scoped client (RLS ensures ownership).
 */
export async function removeTeamMember(
  ownerUserId: string,
  memberId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("team_members")
    .update({ status: "revoked" })
    .eq("id", memberId)
    .eq("owner_user_id", ownerUserId);

  if (error) {
    log.error("Failed to remove team member", { error, memberId, ownerUserId });
    return false;
  }

  log.info("Team member removed", { memberId, ownerUserId });
  return true;
}

/**
 * Update a team member's role.
 * Uses user-scoped client (RLS ensures ownership).
 */
export async function updateMemberRole(
  ownerUserId: string,
  memberId: string,
  newRole: TeamRole
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("team_members")
    .update({ role: newRole })
    .eq("id", memberId)
    .eq("owner_user_id", ownerUserId);

  if (error) {
    log.error("Failed to update member role", {
      error,
      memberId,
      newRole,
      ownerUserId,
    });
    return false;
  }

  log.info("Team member role updated", { memberId, newRole, ownerUserId });
  return true;
}

/**
 * Find all teams a user belongs to (by email).
 * Uses service client for cross-user lookup.
 */
export async function getTeamsForUser(
  userEmail: string
): Promise<TeamMember[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("member_email", userEmail.toLowerCase())
    .in("status", ["invited", "active"])
    .order("invited_at", { ascending: false });

  if (error) {
    log.error("Failed to fetch teams for user", { error, userEmail });
    return [];
  }

  return (data || []) as TeamMember[];
}

/**
 * Accept a team invite. Updates member_user_id and sets status to 'active'.
 * Uses service client because the member may not be the owner (RLS would block).
 */
export async function acceptInvite(
  memberUserId: string,
  memberEmail: string
): Promise<boolean> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("team_members")
    .update({
      member_user_id: memberUserId,
      status: "active",
      accepted_at: new Date().toISOString(),
    })
    .eq("member_email", memberEmail.toLowerCase())
    .eq("status", "invited")
    .select();

  if (error) {
    log.error("Failed to accept invite", { error, memberUserId, memberEmail });
    return false;
  }

  const count = (data || []).length;
  if (count > 0) {
    log.info("Invite accepted", { memberUserId, memberEmail, count });
  }

  return count > 0;
}

/**
 * Accept a single team invite by ID.
 * Verifies the invite email matches the requesting user's email.
 * Uses service client because the member may not be the owner (RLS would block).
 */
export async function acceptInviteById(
  inviteId: string,
  memberUserId: string,
  memberEmail: string
): Promise<{ success: boolean; error?: string; member?: TeamMember }> {
  const supabase = createServiceClient();

  // Fetch the invite to verify it exists and matches
  const { data: invite, error: fetchError } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (fetchError || !invite) {
    log.error("Invite not found", { inviteId, fetchError });
    return { success: false, error: "Invitation not found" };
  }

  const member = invite as TeamMember;

  // Check if already accepted
  if (member.status === "active") {
    return { success: false, error: "Invitation has already been accepted" };
  }

  // Check if revoked
  if (member.status === "revoked") {
    return { success: false, error: "Invitation has been revoked" };
  }

  // Check email match
  if (member.member_email !== memberEmail.toLowerCase()) {
    log.warn("Invite email mismatch", {
      inviteId,
      inviteEmail: member.member_email,
      requestEmail: memberEmail,
    });
    return { success: false, error: "This invitation was sent to a different email address" };
  }

  // Accept the invite
  const { data: updated, error: updateError } = await supabase
    .from("team_members")
    .update({
      member_user_id: memberUserId,
      status: "active",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", inviteId)
    .eq("status", "invited")
    .select()
    .single();

  if (updateError || !updated) {
    log.error("Failed to accept invite by ID", { inviteId, updateError });
    return { success: false, error: "Failed to accept invitation" };
  }

  log.info("Invite accepted by ID", { inviteId, memberUserId, memberEmail });
  return { success: true, member: updated as TeamMember };
}

/**
 * Get pending invitations for a user by email.
 * Uses service client for cross-user lookup.
 */
export async function getPendingInvitations(
  userEmail: string
): Promise<TeamMember[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("member_email", userEmail.toLowerCase())
    .eq("status", "invited")
    .order("invited_at", { ascending: false });

  if (error) {
    log.error("Failed to fetch pending invitations", { error, userEmail });
    return [];
  }

  return (data || []) as TeamMember[];
}

/**
 * Count pending invitations for a user by email.
 * Uses service client for cross-user lookup.
 */
export async function getPendingInvitationCount(
  userEmail: string
): Promise<number> {
  const supabase = createServiceClient();

  const { count, error } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("member_email", userEmail.toLowerCase())
    .eq("status", "invited");

  if (error) {
    log.error("Failed to count pending invitations", { error, userEmail });
    return 0;
  }

  return count || 0;
}

/**
 * Decline (revoke) a single invite by ID from the invitee's perspective.
 * Uses service client because the member is not the owner.
 */
export async function declineInvite(
  inviteId: string,
  memberEmail: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  // Verify the invite belongs to this email before declining
  const { data: invite, error: fetchError } = await supabase
    .from("team_members")
    .select("member_email, status")
    .eq("id", inviteId)
    .single();

  if (fetchError || !invite) {
    return { success: false, error: "Invitation not found" };
  }

  if (invite.member_email !== memberEmail.toLowerCase()) {
    return { success: false, error: "This invitation was sent to a different email address" };
  }

  if (invite.status !== "invited") {
    return { success: false, error: "Invitation is no longer pending" };
  }

  const { error: updateError } = await supabase
    .from("team_members")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("status", "invited");

  if (updateError) {
    log.error("Failed to decline invite", { inviteId, updateError });
    return { success: false, error: "Failed to decline invitation" };
  }

  log.info("Invite declined", { inviteId, memberEmail });
  return { success: true };
}
