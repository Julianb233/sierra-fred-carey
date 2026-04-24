"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  company_name: string | null;
  oases_stage: string | null;
  stage: string | null;
  tier: number | null;
  reality_lens_complete: boolean | null;
  reality_lens_score: number | null;
  enrichment_source: string | null;
  updated_at: string | null;
  auth: {
    last_sign_in_at: string | null;
    recovery_sent_at: string | null;
    email_confirmed_at: string | null;
    imported_from: string | null;
    firebase_uid: string | null;
  } | null;
}

type SourceFilter = "all" | "firebase" | "native" | "test";

function classifyTest(email: string | null): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  const fakes = [
    "eeeee@e.com",
    "iii@jjjj.co",
    "gg@g.com",
    "i@qasfdq.com",
    "dumb@dumber.com",
    "dev@test.com",
    "james@test.com",
    "browser.test.2@example.com",
    "n2938f@yahoo.com",
  ];
  if (fakes.includes(e)) return true;
  const patterns = [
    /^qa-/,
    /^test-/,
    /^test\+/,
    /^deploy-verify/,
    /^bug-test/,
    /^ux-?audit/,
    /^uxtest/,
    /^stagehand-test/,
    /^debugtest/,
    /^chatbot-test/,
    /^v7test/,
    /^testfounder/,
    /^testuser/,
    /^tester_/,
    /^timm@test\.com$/,
    /^uitest/,
    /^john@test\.con$/,
    /^test_random/,
    /^jjjj@j\.com$/,
    /^jjjames/,
    /^joe@blow\.com$/,
    /@example\.com$/,
    /@test\.(com|dev)$/,
    /@test-sahara\.com$/,
    /@sahara-testing/,
    /@thewizzardof\.ai/,
    /@test\.joinsahara\.com$/,
    /@sahara-test\.com$/,
    /@testmail\.com$/,
    /@acrobatics\.dev$/,
  ];
  return patterns.some((p) => p.test(e));
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/users?limit=500");
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        setUsers(json.users || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    }
    load();
  }, []);

  const counts = useMemo(() => {
    const all = users || [];
    return {
      total: all.length,
      firebase: all.filter((u) => u.auth?.imported_from === "firebase").length,
      native: all.filter((u) => !u.auth?.imported_from && !classifyTest(u.email)).length,
      test: all.filter((u) => classifyTest(u.email)).length,
    };
  }, [users]);

  const visible = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (sourceFilter === "firebase" && u.auth?.imported_from !== "firebase") return false;
      if (sourceFilter === "native" && (u.auth?.imported_from || classifyTest(u.email))) return false;
      if (sourceFilter === "test" && !classifyTest(u.email)) return false;
      if (!q) return true;
      const hay = `${u.email || ""} ${u.name || ""} ${u.company_name || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, query, sourceFilter]);

  async function impersonate(userId: string) {
    setImpersonating(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/impersonate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `${res.status}`);
      window.open(json.action_link, "_blank", "noopener,noreferrer");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to impersonate");
    } finally {
      setImpersonating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          All Sahara users: internal team, paying founders, and migrated Firebase accounts.
          Click &quot;Log in as&quot; to view the product through a specific user&apos;s account
          via a Supabase magic link (opens in a new tab; your admin session is preserved).
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-1"><CardDescription>Total</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{counts.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardDescription>Firebase-migrated</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold text-[#ff6a1a]">{counts.firebase}</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardDescription>Real (Supabase-native)</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{counts.native}</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardDescription>Test / internal</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-400">{counts.test}</div></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Search email, name, or company"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          {(["all", "firebase", "native", "test"] as const).map((f) => (
            <Button
              key={f}
              variant={sourceFilter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setSourceFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6 text-red-600 dark:text-red-400">Error: {error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{visible.length} of {counts.total} users</CardTitle>
        </CardHeader>
        <CardContent>
          {!users ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Reality Lens</TableHead>
                    <TableHead>Last sign-in</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium">{u.name || "—"}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </TableCell>
                      <TableCell>{u.company_name || <span className="text-gray-400">—</span>}</TableCell>
                      <TableCell>
                        {u.oases_stage ? <Badge variant="outline">{u.oases_stage}</Badge> : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell>
                        {u.auth?.imported_from === "firebase" ? (
                          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">firebase</Badge>
                        ) : classifyTest(u.email) ? (
                          <Badge variant="secondary">test</Badge>
                        ) : (
                          <Badge variant="outline">native</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.reality_lens_complete ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{u.reality_lens_score ?? "done"}</Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {u.auth?.last_sign_in_at
                          ? new Date(u.auth.last_sign_in_at).toLocaleString()
                          : <span className="text-gray-400">never</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/users/${u.id}`}>
                            <Button variant="outline" size="sm">View</Button>
                          </Link>
                          <Button
                            variant="default"
                            size="sm"
                            disabled={impersonating === u.id}
                            onClick={() => impersonate(u.id)}
                            className="bg-[#ff6a1a] hover:bg-[#ea580c]"
                          >
                            {impersonating === u.id ? "…" : "Log in as"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
