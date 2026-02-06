"use client";

/**
 * Boardy Connect Component
 * Phase 04: Studio Tier Features - Plan 06
 *
 * Card with Boardy branding explanation and deep link to Boardy platform.
 */

import { ExternalLink, Sparkles, Network } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ============================================================================
// Props
// ============================================================================

interface BoardyConnectProps {
  deepLink: string;
}

// ============================================================================
// Component
// ============================================================================

export function BoardyConnect({ deepLink }: BoardyConnectProps) {
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
                Boardy AI
              </h3>
              <Sparkles className="w-4 h-4 text-[#ff6a1a]" />
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Boardy AI matches you with investors and advisors through
              AI-powered introductions. Get matched with the right people
              based on your startup&apos;s stage, sector, and goals.
            </p>

            <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
              Matches are generated based on your startup profile and
              fundraising stage.
            </p>

            {/* CTA Button */}
            <Button
              asChild
              className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
            >
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Network className="w-4 h-4 mr-2" />
                Connect with Boardy
                <ExternalLink className="w-3.5 h-3.5 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
