"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CommunityMember, MemberRole } from "@/lib/communities/types";

interface ModerationToolsProps {
  member: CommunityMember;
  onPromote?: (userId: string) => void;
  onDemote?: (userId: string) => void;
  onRemove?: (userId: string) => void;
}

export function ModerationTools({ member, onPromote, onDemote, onRemove }: ModerationToolsProps) {
  if (member.role === "creator") return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {member.role === "member" && (
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] text-xs"
          onClick={() => onPromote?.(member.user_id)}
        >
          Promote to Mod
        </Button>
      )}
      {member.role === "moderator" && (
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] text-xs"
          onClick={() => onDemote?.(member.user_id)}
        >
          Demote
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="min-h-[44px] text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        onClick={() => onRemove?.(member.user_id)}
      >
        Remove
      </Button>
    </div>
  );
}

const roleBadgeStyles: Record<MemberRole, string> = {
  creator: "bg-[#ff6a1a]/10 text-[#ff6a1a] border-[#ff6a1a]/20",
  moderator: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  member: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export function RoleBadge({ role }: { role: MemberRole }) {
  return (
    <Badge variant="outline" className={`text-xs ${roleBadgeStyles[role]}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}
