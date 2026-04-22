"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface InterventionEvent {
  id: string
  user_id: string
  name: string
  label: string
  stress_level: number
  topics: string[]
  created_at: string
}

interface InterventionLogProps {
  interventions: InterventionEvent[]
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

export function InterventionLog({ interventions }: InterventionLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Intervention Log</CardTitle>
      </CardHeader>
      <CardContent>
        {interventions.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No interventions triggered yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Time</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Founder</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Stress</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Label</th>
                  <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Topics</th>
                </tr>
              </thead>
              <tbody>
                {interventions.map((event) => (
                  <tr key={event.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-gray-900 dark:text-white">{event.name}</td>
                    <td className="py-2 pr-4"><StressBadge level={event.stress_level} /></td>
                    <td className="py-2 pr-4 capitalize text-gray-600 dark:text-gray-300">{event.label}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {event.topics.length > 0 ? event.topics.map((topic) => (
                          <span
                            key={topic}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          >
                            {topic}
                          </span>
                        )) : (
                          <span className="text-xs text-gray-400">--</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
