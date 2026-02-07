"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  ChevronDown,
  CalendarDays,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureLock } from "@/components/tier/feature-lock";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface OutreachEmail {
  subject: string;
  body: string;
  send_day: number;
  purpose: string;
  status: "draft" | "sent" | "skipped";
}

interface OutreachSequence {
  id: string;
  investor_id: string;
  sequence_type: "cold" | "warm_intro" | "follow_up";
  emails: OutreachEmail[];
  timing_notes: string;
  generated_at: string;
}

interface InvestorOption {
  id: string;
  name: string;
  firm: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const SEQUENCE_TYPE_LABELS: Record<string, string> = {
  cold: "Cold Outreach",
  warm_intro: "Warm Introduction",
  follow_up: "Post-Meeting Follow-up",
};

const SEQUENCE_TYPE_OPTIONS = [
  { value: "cold", label: "Cold Outreach" },
  { value: "warm_intro", label: "Warm Introduction" },
  { value: "follow_up", label: "Post-Meeting Follow-up" },
];

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "sent":
      return {
        label: "Sent",
        className:
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      };
    case "skipped":
      return {
        label: "Skipped",
        className:
          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
      };
    default:
      return {
        label: "Draft",
        className:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      };
  }
}

// ============================================================================
// Main Page
// ============================================================================

export default function OutreachPage() {
  const { tier, isLoading: isTierLoading } = useUserTier();

  if (isTierLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <FeatureLock
      requiredTier={UserTier.STUDIO}
      currentTier={tier}
      featureName="Investor Outreach"
      description="Generate AI-personalized investor outreach sequences with Fred's fundraising expertise."
    >
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
          </div>
        }
      >
        <OutreachContent />
      </Suspense>
    </FeatureLock>
  );
}

// ============================================================================
// Content Component
// ============================================================================

function OutreachContent() {
  const searchParams = useSearchParams();
  const investorIdParam = searchParams.get("investorId");

  const [sequences, setSequences] = useState<OutreachSequence[]>([]);
  const [investors, setInvestors] = useState<InvestorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Generation form state
  const [selectedInvestorId, setSelectedInvestorId] = useState(
    investorIdParam || ""
  );
  const [selectedSequenceType, setSelectedSequenceType] = useState("cold");
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Fetch existing sequences
  const fetchSequences = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch investors with existing sequences
      const supabaseRes = await fetch("/api/investors/upload");
      if (supabaseRes.ok) {
        const data = await supabaseRes.json();
        // Extract investors from all lists
        const allInvestors: InvestorOption[] = [];
        for (const list of data.lists || []) {
          if (list.investorDetails) {
            for (const inv of list.investorDetails) {
              allInvestors.push({
                id: inv.id,
                name: inv.name,
                firm: inv.firm,
              });
            }
          }
        }
        // If investorDetails is not available in lists response, try match endpoint
        if (allInvestors.length === 0) {
          const matchRes = await fetch("/api/investors/match");
          if (matchRes.ok) {
            const matchData = await matchRes.json();
            for (const m of matchData.matches || []) {
              if (
                !allInvestors.find(
                  (inv: InvestorOption) => inv.id === m.investorId
                )
              ) {
                allInvestors.push({
                  id: m.investorId,
                  name: m.investorName,
                  firm: m.investorFirm,
                });
              }
            }
          }
        }
        setInvestors(allInvestors);
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  async function handleGenerate() {
    if (!selectedInvestorId) {
      setError("Please select an investor");
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch("/api/investors/generate-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorId: selectedInvestorId,
          sequenceType: selectedSequenceType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate outreach sequence");
        return;
      }

      // Add or update the sequence in local state
      const newSequence = data.sequence as OutreachSequence;
      setSequences((prev) => {
        const existing = prev.findIndex(
          (s) =>
            s.investor_id === newSequence.investor_id &&
            s.sequence_type === newSequence.sequence_type
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newSequence;
          return updated;
        }
        return [newSequence, ...prev];
      });

      setSuccessMessage("Outreach sequence generated successfully!");
    } catch {
      setError("Failed to generate outreach sequence");
    } finally {
      setGenerating(false);
    }
  }

  function handleCopyEmail(sequenceIndex: number, emailIndex: number) {
    const seq = sequences[sequenceIndex];
    if (!seq) return;
    const email = seq.emails[emailIndex];
    if (!email) return;

    const text = `Subject: ${email.subject}\n\n${email.body}`;
    navigator.clipboard.writeText(text).then(() => {
      const key = `${sequenceIndex}-${emailIndex}`;
      setCopiedIndex(key);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  }

  const selectedInvestor = investors.find(
    (i) => i.id === selectedInvestorId
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/investor-targeting">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Investor Outreach
              </h1>
              <p className="text-sm text-gray-500">
                AI-personalized email sequences powered by Fred&apos;s fundraising
                expertise
              </p>
            </div>
          </div>

          <Link href="/dashboard/investor-targeting/pipeline">
            <Button variant="outline" className="gap-2">
              <Send className="h-4 w-4" />
              Pipeline Board
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Status messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3"
          >
            <Check className="h-5 w-5 text-green-500 shrink-0" />
            <p className="text-green-700 dark:text-green-400">
              {successMessage}
            </p>
          </motion.div>
        )}

        {/* Generate Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#ff6a1a]" />
              Generate Outreach Sequence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Select an investor and sequence type. Fred&apos;s AI will generate a
              personalized email sequence with timing recommendations.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Investor selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Investor
                </label>
                <div className="relative">
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm appearance-none pr-8"
                    value={selectedInvestorId}
                    onChange={(e) => setSelectedInvestorId(e.target.value)}
                  >
                    <option value="">Choose an investor...</option>
                    {investors.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name}
                        {inv.firm ? ` (${inv.firm})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Sequence type selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sequence Type
                </label>
                <div className="relative">
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm appearance-none pr-8"
                    value={selectedSequenceType}
                    onChange={(e) => setSelectedSequenceType(e.target.value)}
                  >
                    {SEQUENCE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Generate button */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-transparent">
                  Action
                </label>
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !selectedInvestorId}
                  className="w-full bg-[#ff6a1a] hover:bg-[#ea580c]"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {generating ? "Generating..." : "Generate Sequence"}
                </Button>
              </div>
            </div>

            {loading && investors.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading investors...
              </div>
            )}

            {!loading && investors.length === 0 && (
              <div className="text-sm text-gray-500">
                No investors found. Please{" "}
                <Link
                  href="/dashboard/investor-targeting"
                  className="text-[#ff6a1a] underline"
                >
                  upload an investor list
                </Link>{" "}
                and run AI matching first.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generated Sequences Display */}
        {sequences.length > 0 && (
          <div className="space-y-6">
            {sequences.map((seq, seqIndex) => {
              const investorName =
                investors.find((i) => i.id === seq.investor_id)?.name ||
                "Investor";
              const investorFirm = investors.find(
                (i) => i.id === seq.investor_id
              )?.firm;

              return (
                <motion.div
                  key={`${seq.investor_id}-${seq.sequence_type}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: seqIndex * 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Mail className="h-5 w-5 text-[#ff6a1a]" />
                          {investorName}
                          {investorFirm && (
                            <span className="text-gray-400 font-normal">
                              at {investorFirm}
                            </span>
                          )}
                        </CardTitle>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-[#ff6a1a]/10 text-[#ff6a1a] font-medium">
                          {SEQUENCE_TYPE_LABELS[seq.sequence_type] ||
                            seq.sequence_type}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Email cards */}
                      <div className="space-y-4">
                        {seq.emails.map((email, emailIndex) => {
                          const copyKey = `${seqIndex}-${emailIndex}`;
                          const statusBadge = getStatusBadge(email.status);

                          return (
                            <div
                              key={emailIndex}
                              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1.5 text-sm font-medium text-[#ff6a1a]">
                                    <CalendarDays className="h-4 w-4" />
                                    Day {email.send_day}
                                  </div>
                                  <span
                                    className={cn(
                                      "text-xs px-2 py-0.5 rounded-full",
                                      statusBadge.className
                                    )}
                                  >
                                    {statusBadge.label}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleCopyEmail(seqIndex, emailIndex)
                                  }
                                  className="gap-1.5 text-xs"
                                >
                                  {copiedIndex === copyKey ? (
                                    <>
                                      <Check className="h-3.5 w-3.5 text-green-500" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3.5 w-3.5" />
                                      Copy
                                    </>
                                  )}
                                </Button>
                              </div>

                              {/* Subject */}
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                {email.subject}
                              </h4>

                              {/* Body */}
                              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                                {email.body}
                              </div>

                              {/* Purpose */}
                              {email.purpose && (
                                <p className="mt-2 text-xs text-gray-500 italic">
                                  Purpose: {email.purpose}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Timing Notes */}
                      {seq.timing_notes && (
                        <div className="bg-[#ff6a1a]/5 border border-[#ff6a1a]/20 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-[#ff6a1a] mt-0.5 shrink-0" />
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                Timing Recommendations
                              </h4>
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {seq.timing_notes}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Empty state when no sequences and not loading */}
        {!loading && sequences.length === 0 && investors.length > 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#ff6a1a]/20 to-orange-400/20 flex items-center justify-center"
              >
                <MessageSquare className="h-8 w-8 text-[#ff6a1a]" />
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Outreach Sequences Yet
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Select an investor above and generate your first personalized
                outreach sequence. Fred&apos;s AI will craft emails tailored to each
                investor&apos;s thesis and your startup&apos;s strengths.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
