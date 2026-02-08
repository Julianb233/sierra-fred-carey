"use client";

/**
 * Team Settings Component
 * Phase 33-02: Collaboration & Sharing
 *
 * Wrapper around TeamManager for the settings page.
 * Gated to Studio tier via FeatureLock.
 */

import { Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamManager } from "@/components/sharing/team-manager";
import { UserTier } from "@/lib/constants";

// ============================================================================
// Types
// ============================================================================

interface TeamSettingsProps {
  /** Current user's subscription tier */
  currentTier: UserTier;
}

// ============================================================================
// Component
// ============================================================================

export function TeamSettings({ currentTier }: TeamSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#ff6a1a]" />
          Team &amp; Collaboration
        </CardTitle>
        <CardDescription>
          Invite co-founders, advisors, and team members to collaborate on your
          startup journey. Studio tier supports up to 5 team members.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TeamManager currentTier={currentTier} />
      </CardContent>
    </Card>
  );
}
