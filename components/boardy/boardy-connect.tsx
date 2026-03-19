"use client";

/**
 * Boardy Connect Component
 * AI-3587: Boardy.ai warm investor introductions ($249 tier)
 *
 * Shows context-aware info card:
 * - When Boardy API is live: explains warm intro flow + "Request Call" CTA
 * - When in demo mode: explains AI-generated matches
 */

import { useState } from "react";
import { Sparkles, Network, Phone, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BoardyConnectProps {
  isLive?: boolean;
}

export function BoardyConnect({ isLive = false }: BoardyConnectProps) {
  const [showCallForm, setShowCallForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [callStatus, setCallStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const handleRequestCall = async () => {
    if (!phoneNumber.trim()) return;
    setIsRequesting(true);
    setCallStatus("idle");

    try {
      const response = await fetch("/api/boardy/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setCallStatus("success");
        setStatusMessage(data.message || "Boardy will call you shortly!");
        setShowCallForm(false);
      } else {
        setCallStatus("error");
        setStatusMessage(data.error || "Failed to request call.");
      }
    } catch {
      setCallStatus("error");
      setStatusMessage("Network error. Please try again.");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Card className="border-[#ff6a1a]/20 bg-gradient-to-br from-[#ff6a1a]/5 to-orange-400/5 dark:from-[#ff6a1a]/10 dark:to-orange-400/10">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="p-3 rounded-xl bg-[#ff6a1a]/10 dark:bg-[#ff6a1a]/20">
            <Network className="w-8 h-8 text-[#ff6a1a]" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isLive ? "Warm Investor Introductions" : "AI-Powered Matching"}
              </h3>
              {isLive ? (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                  Live
                </Badge>
              ) : (
                <Sparkles className="w-4 h-4 text-[#ff6a1a]" />
              )}
            </div>

            {isLive ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Get warm introductions to investors who are actively looking
                  to fund startups like yours. Powered by Boardy&apos;s AI matching
                  network of 55,000+ professionals.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                  How it works: Request a call &rarr; Boardy AI learns about your startup
                  &rarr; You get matched with relevant investors &rarr; Both parties
                  opt in before any introduction is made.
                </p>

                {callStatus === "success" ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-400">
                      {statusMessage}
                    </span>
                  </div>
                ) : showCallForm ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (415) 555-1234"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]/50"
                      disabled={isRequesting}
                    />
                    <Button
                      size="sm"
                      className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
                      onClick={handleRequestCall}
                      disabled={isRequesting || !phoneNumber.trim()}
                    >
                      {isRequesting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Phone className="w-3.5 h-3.5 mr-1.5" />
                          Call Me
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowCallForm(false)}
                      disabled={isRequesting}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
                      onClick={() => setShowCallForm(true)}
                    >
                      <Phone className="w-3.5 h-3.5 mr-1.5" />
                      Request Boardy Call
                    </Button>
                    {callStatus === "error" && (
                      <span className="text-xs text-red-500">{statusMessage}</span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
