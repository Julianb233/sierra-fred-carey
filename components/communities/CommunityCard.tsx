"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PersonIcon } from "@radix-ui/react-icons";
import { Users } from "lucide-react";
import type { Community, CommunityCategory } from "@/lib/communities/types";

const categoryColors: Record<CommunityCategory, string> = {
  general: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  industry: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  stage: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  topic: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

interface CommunityCardProps {
  community: Community;
  onJoin?: (communitySlug: string) => void;
  onLeave?: (communitySlug: string) => void;
  isJoining?: boolean;
}

export function CommunityCard({ community, onJoin, onLeave, isJoining }: CommunityCardProps) {
  return (
    <Card className="group relative overflow-hidden border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm hover:shadow-lg hover:scale-[1.01] transition-all duration-300">
      <div className="p-5">
        {/* Icon + Title */}
        <div className="flex items-start gap-3 mb-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#ff6a1a] to-orange-400 flex items-center justify-center text-white shrink-0">
            {community.coverImageUrl ? (
              <img
                src={community.coverImageUrl}
                alt=""
                className="h-6 w-6 rounded object-cover"
              />
            ) : (
              <Users className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={`/dashboard/communities/${community.slug}`}
              className="font-semibold text-gray-900 dark:text-white hover:text-[#ff6a1a] transition-colors line-clamp-1"
            >
              {community.name}
            </Link>
            <Badge className={`mt-1 text-xs ${categoryColors[community.category]}`}>
              {community.category.charAt(0).toUpperCase() + community.category.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">
          {community.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <PersonIcon className="h-3.5 w-3.5" />
            <span>{community.memberCount} {community.memberCount === 1 ? "member" : "members"}</span>
          </div>

          {community.isMember ? (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px] text-sm"
              onClick={() => onLeave?.(community.slug)}
              disabled={isJoining}
            >
              Joined
            </Button>
          ) : (
            <Button
              variant="orange"
              size="sm"
              className="min-h-[44px] min-w-[44px] text-sm"
              onClick={() => onJoin?.(community.slug)}
              disabled={isJoining}
            >
              Join
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
