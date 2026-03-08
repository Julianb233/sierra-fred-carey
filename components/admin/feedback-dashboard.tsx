"use client"

/**
 * Feedback Dashboard
 *
 * Phase 90: User Testing Loop
 * Aggregated user feedback view with filtering, stats, and CSV export.
 */

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeedbackSignal {
  id: string
  user_id: string
  session_id: string
  signal_type: string
  channel: string
  category: string
  rating: number
  message: string
  user_tier: string
  status: string
  created_at: string
}

interface FeedbackStats {
  totalSignals: number
  positiveCount: number
  negativeCount: number
  avgRating: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeedbackDashboard() {
  const [signals, setSignals] = useState<FeedbackSignal[]>([])
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  // Filters
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [ratingFilter, setRatingFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [channelFilter, setChannelFilter] = useState<string>("all")

  const limit = 25

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(limit))
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      if (ratingFilter !== "all") params.set("rating", ratingFilter)
      if (categoryFilter !== "all") params.set("category", categoryFilter)
      if (channelFilter !== "all") params.set("channel", channelFilter)

      const res = await fetch(`/api/admin/feedback?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch feedback")

      const data = await res.json()
      setSignals(data.signals || [])
      setTotal(data.total || 0)

      // Compute basic stats from current data
      const all = data.signals || []
      const positive = all.filter((s: FeedbackSignal) => s.rating === 1).length
      const negative = all.filter((s: FeedbackSignal) => s.rating === -1).length
      const rated = all.filter((s: FeedbackSignal) => s.rating !== null && s.rating !== undefined)
      const avgRating = rated.length > 0
        ? rated.reduce((sum: number, s: FeedbackSignal) => sum + s.rating, 0) / rated.length
        : 0

      setStats({
        totalSignals: data.total || 0,
        positiveCount: positive,
        negativeCount: negative,
        avgRating,
      })
    } catch (err) {
      console.error("Failed to fetch feedback:", err)
    } finally {
      setLoading(false)
    }
  }, [page, dateFrom, dateTo, ratingFilter, categoryFilter, channelFilter])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  // ---------------------------------------------------------------------------
  // CSV Export
  // ---------------------------------------------------------------------------

  const handleExportCSV = () => {
    if (signals.length === 0) return

    const headers = ["Date", "User ID", "Channel", "Category", "Rating", "Message", "Status"]
    const rows = signals.map((s) => [
      new Date(s.created_at).toISOString(),
      s.user_id || "",
      s.channel || "",
      s.category || "",
      String(s.rating ?? ""),
      `"${(s.message || "").replace(/"/g, '""')}"`,
      s.status || "",
    ])

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `sahara-feedback-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const ratingBadge = (rating: number) => {
    if (rating === 1)
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Positive
        </Badge>
      )
    if (rating === -1)
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          Negative
        </Badge>
      )
    return <Badge variant="secondary">Neutral</Badge>
  }

  const totalPages = Math.ceil(total / limit)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loading && !stats ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#ff6a1a]">
                  {stats?.totalSignals ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Positive</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats?.positiveCount ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Negative</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {stats?.negativeCount ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Rating</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#ff6a1a]">
                  {stats?.avgRating ? stats.avgRating.toFixed(2) : "N/A"}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Feedback Signals</CardTitle>
              <CardDescription>
                Filter and review user feedback from all channels
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={signals.length === 0}
            >
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Rating</Label>
              <Select
                value={ratingFilter}
                onValueChange={(v) => {
                  setRatingFilter(v)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="1">Positive</SelectItem>
                  <SelectItem value="0">Neutral</SelectItem>
                  <SelectItem value="-1">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={categoryFilter}
                onValueChange={(v) => {
                  setCategoryFilter(v)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="documents">Documents</SelectItem>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="voice">Voice</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select
                value={channelFilter}
                onValueChange={(v) => {
                  setChannelFilter(v)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="widget">Widget</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="voice">Voice</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Feedback Table */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : signals.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
              No feedback signals found matching the current filters.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead className="max-w-[300px]">Message</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signals.map((signal) => (
                      <TableRow key={signal.id}>
                        <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                          {new Date(signal.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{signal.channel || "-"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {signal.category || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>{ratingBadge(signal.rating)}</TableCell>
                        <TableCell className="max-w-[300px] truncate text-sm">
                          {signal.message || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              signal.status === "resolved"
                                ? "border-green-500 text-green-700"
                                : signal.status === "actioned"
                                  ? "border-blue-500 text-blue-700"
                                  : ""
                            }
                          >
                            {signal.status || "new"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * limit + 1}-
                    {Math.min(page * limit, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
