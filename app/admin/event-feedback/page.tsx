"use client"

import { useEffect, useState } from "react"
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

interface EventFeedbackStats {
  totalResponses: number
  widgetCount: number
  surveyCount: number
  avgWidgetRating: number | null
  avgFredRating: number | null
  npsScore: number | null
  recommendCounts: { yes: number; maybe: number; no: number }
}

interface EventFeedbackRow {
  id: string
  user_id: string
  event_name: string | null
  rating: number | null
  feedback_text: string | null
  fred_rating: number | null
  improvement_text: string | null
  recommend: string | null
  source: string
  user_tier: string | null
  created_at: string
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-yellow-400">
      {"★".repeat(count)}
      <span className="text-gray-300 dark:text-gray-600">
        {"★".repeat(5 - count)}
      </span>
    </span>
  )
}

export default function EventFeedbackPage() {
  const [stats, setStats] = useState<EventFeedbackStats | null>(null)
  const [responses, setResponses] = useState<EventFeedbackRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/event-feedback")
        if (res.ok) {
          const data = await res.json()
          setStats(data.stats)
          setResponses(data.responses)
        }
      } catch (err) {
        console.error("Failed to fetch event feedback:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Event Feedback</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Event Feedback
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Feedback from event attendees
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Responses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#ff6a1a]">
              {stats?.totalResponses ?? 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.widgetCount ?? 0} widget / {stats?.surveyCount ?? 0} survey
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Widget Rating</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#ff6a1a]">
              {stats?.avgWidgetRating != null
                ? stats.avgWidgetRating.toFixed(1)
                : "N/A"}
              {stats?.avgWidgetRating != null && (
                <span className="text-base text-gray-500 ml-1">/ 5</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg FRED Rating</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#ff6a1a]">
              {stats?.avgFredRating != null
                ? stats.avgFredRating.toFixed(1)
                : "N/A"}
              {stats?.avgFredRating != null && (
                <span className="text-base text-gray-500 ml-1">/ 5</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>NPS Score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#ff6a1a]">
              {stats?.npsScore != null ? stats.npsScore : "N/A"}
            </div>
            {stats?.recommendCounts && (
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-green-600 border-green-300">
                  Yes: {stats.recommendCounts.yes}
                </Badge>
                <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                  Maybe: {stats.recommendCounts.maybe}
                </Badge>
                <Badge variant="outline" className="text-red-600 border-red-300">
                  No: {stats.recommendCounts.no}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Responses table */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Responses</CardTitle>
          <CardDescription>All event feedback submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {responses.length === 0 ? (
            <p className="text-sm text-gray-500">No feedback collected yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Recommend</TableHead>
                    <TableHead>Feedback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.source === "widget" ? "default" : "secondary"}>
                          {r.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.user_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {r.source === "widget" && r.rating != null && (
                          <Stars count={r.rating} />
                        )}
                        {r.source === "survey" && r.fred_rating != null && (
                          <Stars count={r.fred_rating} />
                        )}
                      </TableCell>
                      <TableCell>
                        {r.recommend && (
                          <Badge
                            variant="outline"
                            className={
                              r.recommend === "yes"
                                ? "text-green-600 border-green-300"
                                : r.recommend === "no"
                                ? "text-red-600 border-red-300"
                                : "text-yellow-600 border-yellow-300"
                            }
                          >
                            {r.recommend}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {r.feedback_text || r.improvement_text || "-"}
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
  )
}
