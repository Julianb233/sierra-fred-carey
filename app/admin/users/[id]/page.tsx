"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

interface Detail {
  profile: Record<string, unknown> | null;
  auth: {
    id: string;
    email: string | null;
    last_sign_in_at: string | null;
    recovery_sent_at: string | null;
    email_confirmed_at: string | null;
    created_at: string;
    user_metadata?: Record<string, unknown>;
  } | null;
  stats: {
    chat_messages: number;
    journey_events: number;
    fred_steps: number;
  };
  recent: {
    chat: Array<{ id: string; role: string; content: string; created_at: string }>;
    journey: Array<{ event_type: string; metadata?: Record<string, unknown>; created_at: string }>;
  };
}

const CORE_PROFILE_FIELDS: Array<{ key: string; label: string }> = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "company_name", label: "Company" },
  { key: "product_positioning", label: "Product positioning" },
  { key: "oases_stage", label: "Oases stage" },
  { key: "stage", label: "Stage" },
  { key: "industry", label: "Industry" },
  { key: "team_size", label: "Team size" },
  { key: "revenue_range", label: "Revenue" },
  { key: "funding_history", label: "Funding" },
  { key: "traction", label: "Traction" },
  { key: "product_status", label: "Product status" },
  { key: "ninety_day_goal", label: "90-day goal" },
  { key: "primary_constraint", label: "Primary constraint" },
  { key: "co_founder", label: "Co-founder" },
  { key: "reality_lens_score", label: "Reality Lens score" },
];

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/users/${id}`);
        if (!res.ok) throw new Error(`${res.status}`);
        setData(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    }
    load();
  }, [id]);

  async function impersonate() {
    setImpersonating(true);
    try {
      const res = await fetch(`/api/admin/users/${id}/impersonate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `${res.status}`);
      window.open(json.action_link, "_blank", "noopener,noreferrer");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to impersonate");
    } finally {
      setImpersonating(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/admin/users"><Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
        <Card className="border-red-500"><CardContent className="pt-6 text-red-600">Error: {error}</CardContent></Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const profile = (data.profile || {}) as Record<string, unknown>;
  const md = data.auth?.user_metadata || {};
  const firebaseRaw = (profile.enrichment_data as Record<string, unknown> | undefined)?.firebase_raw;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Link href="/admin/users"><Button variant="ghost" size="sm" className="gap-1 mb-2"><ArrowLeft className="h-4 w-4" />All users</Button></Link>
          <h2 className="text-2xl font-bold">{(profile.name as string) || data.auth?.email || id}</h2>
          <p className="text-gray-600 dark:text-gray-400">{data.auth?.email}</p>
        </div>
        <Button onClick={impersonate} disabled={impersonating} className="bg-[#ff6a1a] hover:bg-[#ea580c]">
          {impersonating ? "Generating link…" : "Log in as this user"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-1"><CardDescription>Chat messages</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.stats.chat_messages}</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardDescription>Journey events</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.stats.journey_events}</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardDescription>Fred step progress</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.stats.fred_steps}</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardDescription>Last sign-in</CardDescription></CardHeader>
          <CardContent><div className="text-sm">{data.auth?.last_sign_in_at ? new Date(data.auth.last_sign_in_at).toLocaleString() : <span className="text-gray-400">never</span>}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Source:{" "}
            {(md.imported_from as string) === "firebase" ? (
              <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">firebase-migrated</Badge>
            ) : (
              <Badge variant="outline">native</Badge>
            )}
            {md.firebase_uid ? <span className="ml-2 text-xs text-gray-500">fb_uid: {String(md.firebase_uid)}</span> : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {CORE_PROFILE_FIELDS.map(({ key, label }) => {
              const v = profile[key];
              return (
                <div key={key}>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
                  <dd className="text-sm mt-0.5">{v !== null && v !== undefined && v !== "" ? String(v) : <span className="text-gray-400">—</span>}</dd>
                </div>
              );
            })}
          </dl>
        </CardContent>
      </Card>

      {firebaseRaw ? (
        <Card>
          <CardHeader><CardTitle>Firebase snapshot (preserved)</CardTitle>
            <CardDescription>Original Firestore doc at time of migration — lossless audit trail.</CardDescription></CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-x-auto">{JSON.stringify(firebaseRaw, null, 2)}</pre>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Recent journey events</CardTitle></CardHeader>
        <CardContent>
          {data.recent.journey.length === 0 ? (
            <p className="text-sm text-gray-400">No journey events yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.recent.journey.map((e, i) => (
                <li key={i} className="text-sm border-l-2 border-[#ff6a1a] pl-3">
                  <div className="font-medium">{e.event_type}</div>
                  <div className="text-xs text-gray-500">{new Date(e.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent chat messages</CardTitle></CardHeader>
        <CardContent>
          {data.recent.chat.length === 0 ? (
            <p className="text-sm text-gray-400">No chat activity.</p>
          ) : (
            <ul className="space-y-3">
              {data.recent.chat.map((m) => (
                <li key={m.id} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={m.role === "user" ? "default" : "outline"}>{m.role}</Badge>
                    <span className="text-xs text-gray-500">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <p className="pl-2 border-l-2 border-gray-200 dark:border-gray-700">{m.content.slice(0, 400)}{m.content.length > 400 ? "…" : ""}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
