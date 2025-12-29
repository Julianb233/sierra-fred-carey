import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET - Fetch voice agent analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('config_id');
    const periodType = searchParams.get('period_type') || 'daily';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Get call statistics
    let callStats;
    if (configId) {
      callStats = await sql`
        SELECT
          COUNT(*) as total_calls,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
          COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed_calls,
          COUNT(CASE WHEN escalation_triggered = true THEN 1 END) as escalated_calls,
          COALESCE(AVG(duration_seconds), 0)::integer as avg_duration,
          COALESCE(SUM(duration_seconds), 0) as total_duration
        FROM voice_calls
        WHERE agent_config_id = ${configId}
        ${startDate ? sql`AND started_at >= ${startDate}::timestamp` : sql``}
        ${endDate ? sql`AND started_at <= ${endDate}::timestamp` : sql``}
      `;
    } else {
      callStats = await sql`
        SELECT
          COUNT(*) as total_calls,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
          COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed_calls,
          COUNT(CASE WHEN escalation_triggered = true THEN 1 END) as escalated_calls,
          COALESCE(AVG(duration_seconds), 0)::integer as avg_duration,
          COALESCE(SUM(duration_seconds), 0) as total_duration
        FROM voice_calls
        ${startDate ? sql`WHERE started_at >= ${startDate}::timestamp` : sql``}
        ${endDate ? (startDate ? sql`AND started_at <= ${endDate}::timestamp` : sql`WHERE started_at <= ${endDate}::timestamp`) : sql``}
      `;
    }

    // Get recent calls
    const recentCalls = await sql`
      SELECT
        id, room_name, caller_id, status, started_at, ended_at,
        duration_seconds, escalation_triggered, escalation_reason
      FROM voice_calls
      ORDER BY started_at DESC
      LIMIT 10
    `;

    // Get calls by hour (for chart)
    const callsByHour = await sql`
      SELECT
        EXTRACT(HOUR FROM started_at) as hour,
        COUNT(*) as count
      FROM voice_calls
      WHERE started_at >= NOW() - INTERVAL '7 days'
      GROUP BY EXTRACT(HOUR FROM started_at)
      ORDER BY hour
    `;

    // Get calls by day (for chart)
    const callsByDay = await sql`
      SELECT
        DATE(started_at) as date,
        COUNT(*) as count
      FROM voice_calls
      WHERE started_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(started_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    // Get top escalation reasons
    const escalationReasons = await sql`
      SELECT
        escalation_reason,
        COUNT(*) as count
      FROM voice_calls
      WHERE escalation_triggered = true AND escalation_reason IS NOT NULL
      GROUP BY escalation_reason
      ORDER BY count DESC
      LIMIT 5
    `;

    return NextResponse.json({
      summary: callStats[0] || {
        total_calls: 0,
        completed_calls: 0,
        missed_calls: 0,
        escalated_calls: 0,
        avg_duration: 0,
        total_duration: 0
      },
      recentCalls,
      callsByHour: callsByHour.reduce((acc: Record<string, number>, row) => {
        acc[row.hour as number] = parseInt(row.count as string);
        return acc;
      }, {} as Record<string, number>),
      callsByDay,
      escalationReasons
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// POST - Record call analytics (called by voice agent after call ends)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      room_name,
      caller_id,
      agent_id,
      status = 'completed',
      started_at,
      ended_at,
      duration_seconds,
      transcript,
      recording_url,
      sentiment_scores,
      topics_detected,
      escalation_triggered = false,
      escalation_reason,
      agent_config_id,
      metadata
    } = body;

    const created = await sql`
      INSERT INTO voice_calls (
        room_name, caller_id, agent_id, status, started_at, ended_at,
        duration_seconds, transcript, recording_url, sentiment_scores,
        topics_detected, escalation_triggered, escalation_reason,
        agent_config_id, metadata
      ) VALUES (
        ${room_name}, ${caller_id}, ${agent_id}, ${status},
        ${started_at || new Date().toISOString()}, ${ended_at},
        ${duration_seconds}, ${transcript}, ${recording_url},
        ${sentiment_scores ? JSON.stringify(sentiment_scores) : '[]'}::jsonb,
        ${topics_detected || null}, ${escalation_triggered}, ${escalation_reason},
        ${agent_config_id}, ${metadata ? JSON.stringify(metadata) : '{}'}::jsonb
      )
      RETURNING *
    `;

    return NextResponse.json(created[0], { status: 201 });
  } catch (error) {
    console.error('Error recording call:', error);
    return NextResponse.json(
      { error: 'Failed to record call' },
      { status: 500 }
    );
  }
}
