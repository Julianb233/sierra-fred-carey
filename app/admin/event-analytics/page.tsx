"use client"

/**
 * Admin Event Analytics Page
 * Phase 88: Event Launch Kit
 *
 * Shows event conversion funnel: signups -> onboarding -> Reality Lens -> first FRED chat.
 */

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EVENT_CONFIGS } from "@/lib/event/config"

interface FunnelData {
  totalSignups: number
  onboardingComplete: number
  realityLensComplete: number
  firstChat: number
}

interface RecentSignup {
  id: string
  name: string
  email: string
  createdAt: string
  onboarded: boolean
  realityLens: boolean
  tier: string
  trialEndsAt: string | null
  eventSource: string
}

interface AnalyticsResponse {
  funnel: FunnelData
  recentSignups: RecentSignup[]
  slug: string
}

const eventSlugs = Object.keys(EVENT_CONFIGS)

function FunnelBar({ label, count, total, note }: { label: string; count: number; total: number; note?: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const barWidth = total > 0 ? Math.max((count / total) * 100, 2) : 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-300 font-medium">{label}</span>
        <span className="text-gray-400">
          {count} {total > 0 && count !== total && `(${pct}%)`}
          {note && <span className="ml-2 text-xs text-gray-500">{note}</span>}
        </span>
      </div>
      <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
        <div
          className="h-full bg-[#ff6a1a] rounded-lg transition-all duration-500"
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  )
}

export default function EventAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSlug, setSelectedSlug] = useState(eventSlugs[0] || "")

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/event-analytics?slug=${selectedSlug}`)
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (err) {
        console.error("Failed to fetch event analytics:", err)
      } finally {
        setLoading(false)
      }
    }
    if (selectedSlug) fetchData()
  }, [selectedSlug])

  const funnel = data?.funnel

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Event Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Conversion funnel for event signups
          </p>
        </div>

        <select
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm text-white"
        >
          {eventSlugs.map((slug) => (
            <option key={slug} value={slug}>
              {EVENT_CONFIGS[slug].name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : funnel ? (
        <>
          {/* Funnel Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 font-medium">QR Scans (Landing Views)</span>
                  <span className="text-xs text-gray-500">View in PostHog</span>
                </div>
                <div className="h-8 bg-white/5 rounded-lg overflow-hidden border border-dashed border-white/10" />
              </div>

              <FunnelBar
                label="Signups"
                count={funnel.totalSignups}
                total={funnel.totalSignups}
              />
              <FunnelBar
                label="Onboarding Complete"
                count={funnel.onboardingComplete}
                total={funnel.totalSignups}
              />
              <FunnelBar
                label="Reality Lens Complete"
                count={funnel.realityLensComplete}
                total={funnel.totalSignups}
              />
              <FunnelBar
                label="First FRED Chat"
                count={funnel.firstChat}
                total={funnel.totalSignups}
              />
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-[#ff6a1a]">{funnel.totalSignups}</div>
                <div className="text-sm text-gray-400 mt-1">Total Signups</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-[#ff6a1a]">
                  {funnel.totalSignups > 0
                    ? `${Math.round((funnel.onboardingComplete / funnel.totalSignups) * 100)}%`
                    : "0%"}
                </div>
                <div className="text-sm text-gray-400 mt-1">Onboarding Rate</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-[#ff6a1a]">
                  {funnel.totalSignups > 0
                    ? `${Math.round((funnel.realityLensComplete / funnel.totalSignups) * 100)}%`
                    : "0%"}
                </div>
                <div className="text-sm text-gray-400 mt-1">Reality Lens Rate</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-[#ff6a1a]">
                  {funnel.totalSignups > 0
                    ? `${Math.round((funnel.firstChat / funnel.totalSignups) * 100)}%`
                    : "0%"}
                </div>
                <div className="text-sm text-gray-400 mt-1">Chat Engagement</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Signups Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Event Signups</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentSignups.length === 0 ? (
                <p className="text-sm text-gray-400">No event signups yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-white/10">
                        <th className="pb-2 pr-4">Name</th>
                        <th className="pb-2 pr-4">Email</th>
                        <th className="pb-2 pr-4">Signed Up</th>
                        <th className="pb-2 pr-4 text-center">Onboarded</th>
                        <th className="pb-2 pr-4 text-center">Reality Lens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentSignups.map((signup) => (
                        <tr
                          key={signup.id}
                          className="border-b border-white/5 text-gray-300"
                        >
                          <td className="py-2 pr-4">{signup.name}</td>
                          <td className="py-2 pr-4 text-gray-400">{signup.email}</td>
                          <td className="py-2 pr-4 text-gray-400">
                            {new Date(signup.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2 pr-4 text-center">
                            {signup.onboarded ? (
                              <span className="text-green-400">Yes</span>
                            ) : (
                              <span className="text-gray-600">--</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-center">
                            {signup.realityLens ? (
                              <span className="text-green-400">Yes</span>
                            ) : (
                              <span className="text-gray-600">--</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-12 text-gray-400">No data available.</div>
      )}
    </div>
  )
}
