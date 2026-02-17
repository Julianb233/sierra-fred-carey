"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { FileText, Send, Clock, XCircle, AlertTriangle, CheckCircle } from "lucide-react";

export type DeckRecommendation = "send_now" | "polish_first" | "dont_send" | "wait";

interface DeckProtocolProps {
  recommendation: DeckRecommendation;
  reasoning: string;
  specificGuidance: string[];
  readinessScore: number;
}

const recommendationConfig: Record<DeckRecommendation, {
  icon: typeof Send;
  color: string;
  bgColor: string;
  borderColor: string;
  title: string;
  subtitle: string;
}> = {
  send_now: {
    icon: Send,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    title: "Send the Deck",
    subtitle: "Your materials are investor-ready",
  },
  polish_first: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    title: "Polish Before Sending",
    subtitle: "A few improvements will significantly strengthen your pitch",
  },
  dont_send: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    title: "Don't Send Yet",
    subtitle: "Your deck needs substantial work before investor outreach",
  },
  wait: {
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    title: "Wait for Right Moment",
    subtitle: "Build more traction before approaching investors",
  },
};

export function DeckProtocol({
  recommendation,
  reasoning,
  specificGuidance,
  readinessScore,
}: DeckProtocolProps) {
  const config = recommendationConfig[recommendation];
  const Icon = config.icon;

  return (
    <Card className={cn("overflow-hidden border-2", config.borderColor)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#ff6a1a]" />
          <CardTitle className="text-lg">Deck Request Protocol</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          How to handle investor requests for your pitch deck
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Recommendation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "p-4 rounded-lg flex items-start gap-4",
            config.bgColor
          )}
        >
          <div className={cn("p-3 rounded-full shrink-0", config.bgColor)}>
            <Icon className={cn("h-6 w-6", config.color)} />
          </div>
          <div className="flex-1">
            <h3 className={cn("font-semibold text-lg mb-1", config.color)}>
              {config.title}
            </h3>
            <p className="text-sm text-muted-foreground">{config.subtitle}</p>
          </div>
          <div className="text-right shrink-0">
            <div className={cn("text-2xl font-bold", config.color)}>
              {readinessScore}%
            </div>
            <div className="text-xs text-muted-foreground">Readiness</div>
          </div>
        </motion.div>

        {/* Reasoning */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
          <p className="text-sm font-medium mb-1">Why this recommendation:</p>
          <p className="text-sm text-muted-foreground">{reasoning}</p>
        </div>

        {/* Specific Guidance */}
        {specificGuidance.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">
              {recommendation === "send_now"
                ? "Before you send:"
                : recommendation === "polish_first"
                ? "What to improve:"
                : recommendation === "dont_send"
                ? "What needs work:"
                : "While you wait:"}
            </p>
            <div className="space-y-2">
              {specificGuidance.map((guidance, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-2"
                >
                  <CheckCircle className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
                  <span className="text-sm">{guidance}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Investor Response Templates */}
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">Suggested response language:</p>
          <div className="p-3 rounded-lg bg-[#ff6a1a]/5 border border-[#ff6a1a]/20">
            <p className="text-sm italic text-muted-foreground">
              {recommendation === "send_now" && (
                <>
                  &quot;Thank you for your interest. I&apos;d be happy to share our deck.
                  We&apos;re currently raising [amount] to [key milestone]. I&apos;ve attached
                  our materials - would love to find time to walk you through our
                  progress and vision.&quot;
                </>
              )}
              {recommendation === "polish_first" && (
                <>
                  &quot;Thank you for your interest in [Company Name]. I&apos;m currently
                  finalizing our materials and would like to send you our most
                  compelling version. Would next week work for sharing an updated
                  deck along with a brief intro call?&quot;
                </>
              )}
              {recommendation === "dont_send" && (
                <>
                  &quot;Thank you for your interest. We&apos;re currently heads-down on
                  [key initiative] and expect to have compelling new results in
                  [timeframe]. I&apos;d love to reconnect then when we can show you
                  more meaningful progress.&quot;
                </>
              )}
              {recommendation === "wait" && (
                <>
                  &quot;Thank you for reaching out. We&apos;re in an exciting building phase
                  and are targeting to begin fundraising conversations in [timeframe].
                  I&apos;d love to keep you updated on our progress - would it be okay
                  to circle back then?&quot;
                </>
              )}
            </p>
          </div>
        </div>

        {/* CTA */}
        {recommendation === "polish_first" && (
          <Button className="w-full bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white">
            Get Deck Review
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
