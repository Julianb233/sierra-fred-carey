"use client"

/**
 * Iteration Dashboard
 *
 * Phase 90: User Testing Loop
 * Shows 48-hour SLA compliance, fix velocity, and recent feedback signals.
 * Color-codes SLA: green >= 80%, yellow 50-79%, red < 50%.
 */

import { useEffect, useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface IterationMetrics {
  totalSignals: number
  statusBreakdown: {
    new: number
    triaged: number
    resolved: number
    other: number
  }
  triagedPercent: number
  resolvedIn48hPercent: number
  avgResolutionHours: number | null
  patchCount: number
  avgSignalToPatchHours: number | null
}

interface RecentSignal {
  id: string
  status: string
  channel: string
  message: string
  created_at: string
}

function slaColor(percent: number): string {
  if (percent >= 80) return "text-green-600 dark:text-green-400"
  if (percent >= 50) return "text-yellow-600 dark:text-yellow-400"
  return "text-red-600 dark:text-red-400"
}

function slaBadge(percent: number): "default" | "secondary" | "destructive" {
  if (percent >= 80) return "default"
  if (percent >= 50) return "secondary"
  return "destructive"
}

export function IterationDashboard() {
  const [metrics, setMetrics] = useState<IterationMetrics | null>(null)
  const [signals, setSignals] = useState<RecentSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/iteration-metrics")
      if (!res.ok) throw new Error("Failed to fetch metrics")
      const data = await res.json()
      setMetrics(data.metrics)
      setSignals(data.recentSignals || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {error || "No iteration data available"}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Signals</CardDescription>
            <CardTitle className="text-3xl">{metrics.totalSignals}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {metrics.statusBreakdown.new} new,{" "}
              {metrics.statusBreakdown.triaged} triaged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Triaged %</CardDescription>
            <CardTitle className="text-3xl">
              {metrics.triagedPercent}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {metrics.statusBreakdown.triaged + metrics.statusBreakdown.resolved}{" "}
              of {metrics.totalSignals} signals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resolved in 48h</CardDescription>
            <CardTitle
              className={cn("text-3xl", slaColor(metrics.resolvedIn48hPercent))}
            >
              {metrics.resolvedIn48hPercent}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={slaBadge(metrics.resolvedIn48hPercent)}>
              {metrics.resolvedIn48hPercent >= 80
                ? "SLA Met"
                : metrics.resolvedIn48hPercent >= 50
                  ? "At Risk"
                  : "SLA Breached"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Resolution</CardDescription>
            <CardTitle className="text-3xl">
              {metrics.avgResolutionHours != null
                ? `${metrics.avgResolutionHours}h`
                : "--"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {metrics.patchCount} patches applied
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Signals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Signals</CardTitle>
          <CardDescription>
            Latest feedback signals with status and resolution time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signals.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No recent signals
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="max-w-[300px]">Message</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.slice(0, 20).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Badge
                        variant={
                          s.status === "resolved"
                            ? "default"
                            : s.status === "triaged"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{s.channel}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm">
                      {s.message || "--"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
