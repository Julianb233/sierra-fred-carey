"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SentimentChart } from "../components/sentiment-chart"
import { InterventionLog } from "../components/intervention-log"

interface OverviewData {
  totalSignals: number
  labelDistribution: Array<{ label: string; count: number }>
  interventionCount: number
  highStressFounders: Array<{
    user_id: string
    name: string
    avg_stress_level: number
    signal_count: number
    last_signal_at: string
  }>
}

interface InterventionEvent {
  id: string
  user_id: string
  name: string
  label: string
  stress_level: number
  topics: string[]
  created_at: string
}

export default function SentimentDashboard() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [interventions, setInterventions] = useState<InterventionEvent[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewRes, interventionsRes] = await Promise.all([
          fetch("/api/admin/sentiment?view=overview"),
          fetch("/api/admin/sentiment?view=interventions"),
        ])

        if (overviewRes.ok) {
          setOverview(await overviewRes.json())
        }
        if (interventionsRes.ok) {
          setInterventions(await interventionsRes.json())
        }
      } catch (error) {
        console.error("Error fetching sentiment data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Founder Mindset Monitor</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-4 w-20" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const positiveCount = overview?.labelDistribution.find((d) => d.label === "positive")?.count ?? 0
  const frustratedCount = overview?.labelDistribution.find((d) => d.label === "frustrated")?.count ?? 0
  const total = overview?.totalSignals ?? 0
  const positivePct = total > 0 ? ((positiveCount / total) * 100).toFixed(1) : "0"
  const frustratedPct = total > 0 ? ((frustratedCount / total) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Founder Mindset Monitor
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Sentiment patterns and stress intervention tracking
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Signals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#ff6a1a]">{total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Positive %</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{positivePct}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Frustrated %</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{frustratedPct}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Interventions Triggered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#ff6a1a]">{overview?.interventionCount ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <SentimentChart
        data={overview?.labelDistribution ?? []}
        highStressFounders={overview?.highStressFounders ?? []}
      />

      <InterventionLog interventions={interventions ?? []} />
    </div>
  )
}
