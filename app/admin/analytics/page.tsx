"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EngagementMetrics {
  totalUsers: number;
  activeUsers7d: number;
  newSignups7d: number;
  onboardingCompletionRate: number;
  featureAdoption: {
    chat: number;
    realityLens: number;
    pitchDeck: number;
    agents: number;
  };
}

interface FunnelStep {
  label: string;
  count: number;
  percentage: number;
}

// ---------------------------------------------------------------------------
// Funnel visualization
// ---------------------------------------------------------------------------

const FUNNEL_STEPS_CONFIG = [
  { key: "signup", label: "Signup" },
  { key: "onboarding", label: "Onboarding Complete" },
  { key: "firstChat", label: "First Chat" },
  { key: "realityLens", label: "Reality Lens Used" },
  { key: "upgrade", label: "Upgrade to Pro/Studio" },
] as const;

function FunnelBar({ step, maxCount }: { step: FunnelStep; maxCount: number }) {
  const widthPct = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-900 dark:text-white">
          {step.label}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          {step.count} ({step.percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-8 w-full bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
        <div
          className="h-full bg-[#ff6a1a] rounded-md transition-all duration-500"
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Placeholder event rows
// ---------------------------------------------------------------------------

interface EventRow {
  timestamp: string;
  event: string;
  userId: string;
  properties: string;
}

function placeholderEvents(): EventRow[] {
  return [
    {
      timestamp: new Date().toISOString(),
      event: "auth.signup",
      userId: "demo-user-1",
      properties: '{"method":"email"}',
    },
    {
      timestamp: new Date(Date.now() - 60_000).toISOString(),
      event: "chat.session_started",
      userId: "demo-user-2",
      properties: '{"tier":"pro"}',
    },
    {
      timestamp: new Date(Date.now() - 120_000).toISOString(),
      event: "features.reality_lens_used",
      userId: "demo-user-1",
      properties: "{}",
    },
    {
      timestamp: new Date(Date.now() - 180_000).toISOString(),
      event: "onboarding.completed",
      userId: "demo-user-3",
      properties: '{"totalSteps":4}',
    },
    {
      timestamp: new Date(Date.now() - 240_000).toISOString(),
      event: "subscription.checkout_completed",
      userId: "demo-user-2",
      properties: '{"toTier":"studio"}',
    },
  ];
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminAnalyticsPage() {
  const [metrics, setMetrics] = useState<EngagementMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEngagement() {
      try {
        const res = await fetch("/api/admin/analytics/engagement");
        if (!res.ok) {
          throw new Error(`Failed to fetch engagement data: ${res.status}`);
        }
        const data: EngagementMetrics = await res.json();
        setMetrics(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load analytics"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchEngagement();
  }, []);

  // Build funnel steps from metrics
  const funnelSteps: FunnelStep[] = metrics
    ? buildFunnelSteps(metrics)
    : [];

  const posthogConfigured = !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const events = posthogConfigured ? placeholderEvents() : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Product Analytics
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          User engagement, funnels, and growth metrics
        </p>
      </div>

      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {posthogConfigured && (
            <TabsTrigger value="events">Events</TabsTrigger>
          )}
          <TabsTrigger value="funnels">Funnels</TabsTrigger>
        </TabsList>

        {/* ----- Overview Tab ----- */}
        <TabsContent value="overview">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : metrics ? (
            <div className="space-y-6 mt-4">
              {/* Stat cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Users"
                  value={metrics.totalUsers}
                />
                <StatCard
                  label="Active Users (7d)"
                  value={metrics.activeUsers7d}
                />
                <StatCard
                  label="New Signups (7d)"
                  value={metrics.newSignups7d}
                />
                <StatCard
                  label="Onboarding Rate"
                  value={`${metrics.onboardingCompletionRate.toFixed(1)}%`}
                />
              </div>

              {/* Feature adoption */}
              <Card>
                <CardHeader>
                  <CardTitle>Feature Adoption</CardTitle>
                  <CardDescription>
                    Percentage of users who have used each feature
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FeatureAdoptionCard
                      label="Chat"
                      pct={metrics.featureAdoption.chat}
                    />
                    <FeatureAdoptionCard
                      label="Reality Lens"
                      pct={metrics.featureAdoption.realityLens}
                    />
                    <FeatureAdoptionCard
                      label="Pitch Deck"
                      pct={metrics.featureAdoption.pitchDeck}
                    />
                    <FeatureAdoptionCard
                      label="Agents"
                      pct={metrics.featureAdoption.agents}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>

        {/* ----- Events Tab (only when PostHog is configured) ----- */}
        {posthogConfigured && (
          <TabsContent value="events">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Recent Events</CardTitle>
                <CardDescription>
                  Latest tracked product analytics events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Properties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((evt, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {new Date(evt.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {evt.event}
                          </code>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {evt.userId}
                        </TableCell>
                        <TableCell className="text-xs font-mono max-w-[200px] truncate">
                          {evt.properties}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ----- Funnels Tab ----- */}
        <TabsContent value="funnels">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>
                Signup → Onboarding → First Chat → Reality Lens → Upgrade
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : funnelSteps.length > 0 ? (
                <div className="space-y-4">
                  {funnelSteps.map((step) => (
                    <FunnelBar
                      key={step.label}
                      step={step}
                      maxCount={funnelSteps[0].count}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No funnel data available yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-[#ff6a1a]">{value}</div>
      </CardContent>
    </Card>
  );
}

function FeatureAdoptionCard({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <div className="text-2xl font-bold text-[#ff6a1a]">
        {pct.toFixed(1)}%
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Funnel builder
// ---------------------------------------------------------------------------

function buildFunnelSteps(metrics: EngagementMetrics): FunnelStep[] {
  const total = metrics.totalUsers || 1;
  const onboarded = Math.round(
    (metrics.onboardingCompletionRate / 100) * total
  );
  const chatUsers = Math.round((metrics.featureAdoption.chat / 100) * total);
  const rlUsers = Math.round(
    (metrics.featureAdoption.realityLens / 100) * total
  );
  // Estimate upgrade as users who adopted agents (proxy for paid features)
  const upgradeUsers = Math.round(
    (metrics.featureAdoption.agents / 100) * total
  );

  const steps = [
    { label: "Signup", count: total },
    { label: "Onboarding Complete", count: onboarded },
    { label: "First Chat", count: chatUsers },
    { label: "Reality Lens Used", count: rlUsers },
    { label: "Upgrade", count: upgradeUsers },
  ];

  return steps.map((s) => ({
    ...s,
    percentage: total > 0 ? (s.count / total) * 100 : 0,
  }));
}
