"use client";

/**
 * Boardy Connect Component
 * Phase 89: Boardy Polish
 *
 * In-platform info card explaining how AI matching works.
 * No external links -- the entire experience feels native to Sahara.
 */

import { Sparkles, Network } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// ============================================================================
// Component
// ============================================================================

export function BoardyConnect() {
  return (
    <Card className="border-[#ff6a1a]/20 bg-gradient-to-br from-[#ff6a1a]/5 to-orange-400/5 dark:from-[#ff6a1a]/10 dark:to-orange-400/10">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {/* Icon */}
          <div className="p-3 rounded-xl bg-[#ff6a1a]/10 dark:bg-[#ff6a1a]/20">
            <Network className="w-8 h-8 text-[#ff6a1a]" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI-Powered Matching
              </h3>
              <Sparkles className="w-4 h-4 text-[#ff6a1a]" />
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Your matches are AI-generated based on your startup profile,
              stage, and fundraising goals. Connect with matches below and
              use the preparation tools to get ready for introductions.
            </p>

            <p className="text-xs text-gray-500 dark:text-gray-500">
              Matches are refreshed periodically as your profile evolves.
              Use the &quot;Prepare for This Intro&quot; card on each match
              for personalized call scripts and email templates.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
