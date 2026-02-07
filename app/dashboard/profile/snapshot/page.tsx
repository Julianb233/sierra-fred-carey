"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Building2,
  DollarSign,
  Users,
  TrendingUp,
  Target,
  Clock,
  Pencil,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// Types
// ============================================================================

interface ProfileSnapshot {
  startupName: string | null;
  stage: string | null;
  challenges: string[];
  industry: string | null;
  revenueRange: string | null;
  teamSize: number | null;
  fundingHistory: string | null;
  enrichedAt: string | null;
  enrichmentSource: string | null;
  createdAt: string | null;
}

// ============================================================================
// Helpers
// ============================================================================

const STAGE_LABELS: Record<string, string> = {
  idea: "Idea Stage",
  mvp: "MVP",
  "pre-seed": "Pre-Seed",
  seed: "Seed",
  "series-a": "Series A",
};

const INDUSTRY_LABELS: Record<string, string> = {
  saas: "SaaS",
  "e-commerce": "E-commerce",
  fintech: "FinTech",
  healthtech: "HealthTech",
  edtech: "EdTech",
  marketplace: "Marketplace",
  consumer: "Consumer",
  enterprise: "Enterprise",
  "ai-ml": "AI/ML",
  hardware: "Hardware",
  other: "Other",
};

const REVENUE_LABELS: Record<string, string> = {
  "pre-revenue": "Pre-revenue",
  "0-10k": "$0 - $10K/mo",
  "10k-50k": "$10K - $50K/mo",
  "50k-100k": "$50K - $100K/mo",
  "100k-500k": "$100K - $500K/mo",
  "500k+": "$500K+/mo",
};

const FUNDING_LABELS: Record<string, string> = {
  bootstrapped: "Bootstrapped",
  "friends-family": "Friends & Family",
  angel: "Angel Round",
  seed: "Seed Round",
  "series-a+": "Series A+",
  "revenue-funded": "Revenue-funded",
};

const CHALLENGE_LABELS: Record<string, string> = {
  "product-market-fit": "Product-Market Fit",
  fundraising: "Fundraising",
  "team-building": "Team Building",
  "growth-scaling": "Growth & Scaling",
  "unit-economics": "Unit Economics",
  "strategic-planning": "Strategy",
};

function formatLabel(
  value: string | null,
  map: Record<string, string>
): string {
  if (!value) return "Not yet captured";
  return map[value] || value;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Unknown";
  }
}

// ============================================================================
// Sub-components
// ============================================================================

function MutedText({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm text-gray-400 dark:text-gray-500 italic">
      {children}
    </span>
  );
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const displayValue =
    value !== null && value !== undefined && value !== "" ? (
      <span className="text-gray-900 dark:text-white font-medium">
        {value}
      </span>
    ) : (
      <MutedText>Not yet captured</MutedText>
    );

  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="text-sm text-right">{displayValue}</div>
    </div>
  );
}

function SnapshotSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function ProfileSnapshotPage() {
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/dashboard/profile/snapshot");
        const json = await res.json();

        if (!res.ok || !json.success) {
          setError(json.error || "Failed to load profile");
          return;
        }

        setProfile(json.data);
      } catch (err) {
        console.error("[Snapshot] Fetch error:", err);
        setError("Could not connect to server");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6">
        <SnapshotSkeleton />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto text-center py-16">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {error || "Profile not found"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Complete onboarding to build your founder profile.
          </p>
          <Link href="/onboarding">
            <Button className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
              Start Onboarding
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Founder Profile Snapshot
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Last updated:{" "}
              {formatDate(profile.enrichedAt || profile.createdAt)}
            </p>
          </div>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </Link>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Startup Info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#ff6a1a]" />
                <CardTitle className="text-lg">Startup Info</CardTitle>
              </div>
              <CardDescription>Core company details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <FieldRow label="Name" value={profile.startupName} />
              <FieldRow
                label="Stage"
                value={formatLabel(profile.stage, STAGE_LABELS)}
              />
              <FieldRow
                label="Industry"
                value={formatLabel(profile.industry, INDUSTRY_LABELS)}
              />
            </CardContent>
          </Card>

          {/* Financials */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#ff6a1a]" />
                <CardTitle className="text-lg">Financials</CardTitle>
              </div>
              <CardDescription>Revenue and funding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <FieldRow
                label="Revenue"
                value={formatLabel(profile.revenueRange, REVENUE_LABELS)}
              />
              <FieldRow
                label="Funding"
                value={formatLabel(profile.fundingHistory, FUNDING_LABELS)}
              />
            </CardContent>
          </Card>

          {/* Team */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#ff6a1a]" />
                <CardTitle className="text-lg">Team</CardTitle>
              </div>
              <CardDescription>Team composition</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <FieldRow
                label="Team Size"
                value={
                  profile.teamSize !== null
                    ? `${profile.teamSize} ${profile.teamSize === 1 ? "person" : "people"}`
                    : null
                }
              />
            </CardContent>
          </Card>

          {/* Challenges */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[#ff6a1a]" />
                <CardTitle className="text-lg">Challenges</CardTitle>
              </div>
              <CardDescription>Focus areas</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.challenges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.challenges.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ff6a1a]/10 text-[#ff6a1a]"
                    >
                      {CHALLENGE_LABELS[c] || c}
                    </span>
                  ))}
                </div>
              ) : (
                <MutedText>Not yet captured</MutedText>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enrichment Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <CardTitle className="text-lg">Enrichment Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Source:{" "}
                </span>
                <span className="text-gray-900 dark:text-white font-medium capitalize">
                  {profile.enrichmentSource || "Not enriched"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Enriched:{" "}
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {profile.enrichedAt
                    ? formatDate(profile.enrichedAt)
                    : "Not yet"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Profile created:{" "}
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatDate(profile.createdAt)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FRED view note */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[#ff6a1a]/5 border border-[#ff6a1a]/20">
          <TrendingUp className="h-5 w-5 text-[#ff6a1a] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              This is how FRED sees your startup
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The more you share, the more personalized and relevant FRED&apos;s
              advice becomes. Update your profile anytime from Settings.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
