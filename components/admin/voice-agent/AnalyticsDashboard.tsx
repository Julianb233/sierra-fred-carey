'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneOff, PhoneForwarded, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CallSummary {
  total_calls: number;
  completed_calls: number;
  missed_calls: number;
  escalated_calls: number;
  avg_duration: number;
  total_duration: number;
}

interface RecentCall {
  id: string;
  room_name: string;
  caller_id: string;
  status: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  escalation_triggered: boolean;
  escalation_reason: string;
}

interface AnalyticsData {
  summary: CallSummary;
  recentCalls: RecentCall[];
  callsByHour: Record<string, number>;
  callsByDay: { date: string; count: number }[];
  escalationReasons: { escalation_reason: string; count: number }[];
}

interface AnalyticsDashboardProps {
  data: AnalyticsData | null;
  loading: boolean;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AnalyticsDashboard({ data, loading }: AnalyticsDashboardProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No analytics data available yet. Data will appear after calls are made.
        </CardContent>
      </Card>
    );
  }

  const { summary, recentCalls, escalationReasons } = data;
  const completionRate = summary.total_calls > 0
    ? Math.round((summary.completed_calls / summary.total_calls) * 100)
    : 0;
  const escalationRate = summary.total_calls > 0
    ? Math.round((summary.escalated_calls / summary.total_calls) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_calls}</div>
            <p className="text-xs text-muted-foreground">
              {formatDuration(summary.total_duration)} total time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            {completionRate >= 80 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : completionRate >= 60 ? (
              <Minus className="h-4 w-4 text-yellow-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {summary.completed_calls} completed / {summary.missed_calls} missed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(summary.avg_duration)}</div>
            <p className="text-xs text-muted-foreground">
              per call
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Escalation Rate</CardTitle>
            <PhoneForwarded className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{escalationRate}%</div>
            <p className="text-xs text-muted-foreground">
              {summary.escalated_calls} escalated calls
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Calls & Escalation Reasons */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
            <CardDescription>Last 10 voice interactions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCalls.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No calls recorded yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {call.status === 'completed' ? (
                        <Phone className="h-4 w-4 text-green-500" />
                      ) : call.status === 'missed' ? (
                        <PhoneOff className="h-4 w-4 text-red-500" />
                      ) : (
                        <Phone className="h-4 w-4 text-yellow-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {call.caller_id || 'Unknown Caller'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(call.started_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {formatDuration(call.duration_seconds || 0)}
                      </p>
                      {call.escalation_triggered && (
                        <Badge variant="secondary" className="text-xs">
                          Escalated
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Escalation Reasons</CardTitle>
            <CardDescription>Why calls are being transferred</CardDescription>
          </CardHeader>
          <CardContent>
            {escalationReasons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No escalations recorded
              </p>
            ) : (
              <div className="space-y-3">
                {escalationReasons.map((reason, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <p className="text-sm">{reason.escalation_reason || 'Unknown'}</p>
                    <Badge variant="outline">{reason.count} calls</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Call Volume by Hour (simplified bar chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Call Volume by Hour</CardTitle>
          <CardDescription>Distribution of calls throughout the day (last 7 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {Array.from({ length: 24 }, (_, hour) => {
              const count = data.callsByHour[hour] || 0;
              const maxCount = Math.max(...Object.values(data.callsByHour), 1);
              const height = count > 0 ? Math.max((count / maxCount) * 100, 10) : 5;

              return (
                <div key={hour} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full rounded-t transition-all ${
                      count > 0 ? 'bg-primary' : 'bg-muted'
                    }`}
                    style={{ height: `${height}%` }}
                    title={`${hour}:00 - ${count} calls`}
                  />
                  {hour % 4 === 0 && (
                    <span className="text-xs text-muted-foreground mt-1">
                      {hour.toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
