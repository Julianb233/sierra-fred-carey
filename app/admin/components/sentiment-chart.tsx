"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LabelData {
  label: string
  count: number
}

interface HighStressFounder {
  user_id: string
  name: string
  avg_stress_level: number
  signal_count: number
  last_signal_at: string
}

interface SentimentChartProps {
  data: LabelData[]
  highStressFounders: HighStressFounder[]
}

const LABEL_COLORS: Record<string, string> = {
  positive: "#22c55e",
  neutral: "#9ca3af",
  negative: "#f59e0b",
  frustrated: "#ef4444",
}

function StressBadge({ level }: { level: number }) {
  const color = level > 0.7 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    : level > 0.5 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {(level * 100).toFixed(0)}%
    </span>
  )
}

export function SentimentChart({ data, highStressFounders }: SentimentChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sentiment Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No sentiment signals yet</p>
          ) : (
            <div className="space-y-3">
              {data.map((d) => {
                const pct = total > 0 ? (d.count / total) * 100 : 0
                return (
                  <div key={d.label} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-20 capitalize">{d.label}</span>
                    <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: LABEL_COLORS[d.label] || "#9ca3af",
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-16 text-right">
                      {d.count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">High Stress Founders</CardTitle>
        </CardHeader>
        <CardContent>
          {highStressFounders.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No high-stress founders detected</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Avg Stress</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Signals</th>
                    <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Last Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {highStressFounders.map((f) => (
                    <tr key={f.user_id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="py-2 pr-4 text-gray-900 dark:text-white">{f.name}</td>
                      <td className="py-2 pr-4"><StressBadge level={f.avg_stress_level} /></td>
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{f.signal_count}</td>
                      <td className="py-2 text-gray-500 dark:text-gray-400 text-xs">
                        {new Date(f.last_signal_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
