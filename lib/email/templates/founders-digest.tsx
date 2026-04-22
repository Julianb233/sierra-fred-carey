/**
 * Founders Weekly Digest Email Template
 * AI-4117: Weekly summary for Sahara Founders group
 *
 * Shows feedback trends, top open issues, and resolution velocity
 * so Fred and the team can see what's being worked on.
 */

import {
  Section,
  Text,
  Link,
  Row,
  Column,
  Hr,
} from '@react-email/components';
import { EmailLayout } from './layout';

export interface FoundersDigestProps {
  period: { from: string; to: string };
  feedbackTrends: {
    totalSignals: number;
    positiveCount: number;
    negativeCount: number;
    topCategories: Array<{ category: string; count: number }>;
    weekOverWeekChange: number | null; // percentage
  };
  openIssues: Array<{
    title: string;
    severity: string;
    signalCount: number;
    daysSinceCreated: number;
    linearIssueId?: string | null;
  }>;
  resolutionMetrics: {
    avgResolutionHours: number | null;
    resolvedThisWeek: number;
    resolvedIn24hPercent: number;
    backlogSize: number;
  };
  appUrl?: string;
}

function StatCard({
  label,
  value,
  subtext,
  bgColor,
  textColor,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  bgColor: string;
  textColor?: string;
}) {
  return (
    <Column
      style={{
        textAlign: 'center' as const,
        padding: '16px 8px',
        backgroundColor: bgColor,
        borderRadius: '6px',
      }}
    >
      <Text
        style={{
          fontSize: '28px',
          fontWeight: 700,
          margin: '0 0 4px 0',
          color: textColor || '#1f2937',
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: '11px',
          color: '#6b7280',
          margin: 0,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </Text>
      {subtext && (
        <Text
          style={{
            fontSize: '10px',
            color: '#9ca3af',
            margin: '4px 0 0 0',
          }}
        >
          {subtext}
        </Text>
      )}
    </Column>
  );
}

const severityColors: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#6b7280',
};

export function FoundersDigest(props: FoundersDigestProps) {
  const {
    period,
    feedbackTrends,
    openIssues,
    resolutionMetrics,
    appUrl = '',
  } = props;

  const avgHoursDisplay =
    resolutionMetrics.avgResolutionHours !== null
      ? resolutionMetrics.avgResolutionHours < 24
        ? `${Math.round(resolutionMetrics.avgResolutionHours)}h`
        : `${Math.round(resolutionMetrics.avgResolutionHours / 24)}d`
      : 'N/A';

  const wowLabel =
    feedbackTrends.weekOverWeekChange !== null
      ? feedbackTrends.weekOverWeekChange > 0
        ? `+${feedbackTrends.weekOverWeekChange}% vs last week`
        : `${feedbackTrends.weekOverWeekChange}% vs last week`
      : undefined;

  return (
    <EmailLayout
      previewText={`Sahara Weekly Digest: ${period.from} - ${period.to}`}
      appUrl={appUrl}
    >
      {/* Title */}
      <Text
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#ff6a1a',
          margin: '0 0 4px 0',
        }}
      >
        Weekly Team Digest
      </Text>
      <Text
        style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: '0 0 24px 0',
        }}
      >
        {period.from} to {period.to}
      </Text>

      {/* Overview stats */}
      <Section style={{ marginBottom: '24px' }}>
        <Row>
          <StatCard
            label="Feedback Signals"
            value={feedbackTrends.totalSignals}
            subtext={wowLabel}
            bgColor="#fff7ed"
          />
          <Column style={{ width: '8px' }} />
          <StatCard
            label="Avg Resolution"
            value={avgHoursDisplay}
            bgColor="#f0fdf4"
          />
          <Column style={{ width: '8px' }} />
          <StatCard
            label="Resolved This Week"
            value={resolutionMetrics.resolvedThisWeek}
            subtext={`${resolutionMetrics.resolvedIn24hPercent}% within 24h`}
            bgColor="#eff6ff"
          />
        </Row>
      </Section>

      {/* Feedback Trends */}
      {feedbackTrends.topCategories.length > 0 && (
        <Section style={{ marginBottom: '24px' }}>
          <Text
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#1f2937',
              margin: '0 0 12px 0',
            }}
          >
            Feedback Trends
          </Text>
          <Text
            style={{
              fontSize: '13px',
              color: '#6b7280',
              margin: '0 0 12px 0',
            }}
          >
            {feedbackTrends.positiveCount} positive, {feedbackTrends.negativeCount} negative
          </Text>
          {feedbackTrends.topCategories.map((cat, i) => (
            <Row key={i} style={{ marginBottom: '6px' }}>
              <Column style={{ width: '24px', verticalAlign: 'top' as const }}>
                <Text style={{ margin: 0, fontSize: '14px', color: '#ff6a1a' }}>
                  {i + 1}.
                </Text>
              </Column>
              <Column>
                <Text style={{ margin: 0, fontSize: '14px', color: '#1f2937' }}>
                  <strong>{cat.category.replace(/_/g, ' ')}</strong>
                  {' '}({cat.count} signals)
                </Text>
              </Column>
            </Row>
          ))}
        </Section>
      )}

      <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 24px 0' }} />

      {/* Top Open Issues */}
      <Section style={{ marginBottom: '24px' }}>
        <Text
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#1f2937',
            margin: '0 0 12px 0',
          }}
        >
          Top Open Issues ({openIssues.length})
        </Text>
        {openIssues.length === 0 ? (
          <Text style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            No open issues this week. All clear!
          </Text>
        ) : (
          openIssues.map((issue, i) => (
            <Section
              key={i}
              style={{
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                padding: '12px 16px',
                marginBottom: '8px',
                borderLeft: `3px solid ${severityColors[issue.severity] || '#6b7280'}`,
              }}
            >
              <Text style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                {issue.title}
              </Text>
              <Text style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                {issue.severity} severity &middot; {issue.signalCount} signal{issue.signalCount !== 1 ? 's' : ''} &middot; {issue.daysSinceCreated}d old
                {issue.linearIssueId && ` \u00b7 ${issue.linearIssueId}`}
              </Text>
            </Section>
          ))
        )}
      </Section>

      <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 24px 0' }} />

      {/* Resolution metrics */}
      <Section style={{ marginBottom: '24px' }}>
        <Row>
          <StatCard
            label="Backlog"
            value={resolutionMetrics.backlogSize}
            bgColor={resolutionMetrics.backlogSize > 10 ? '#fee2e2' : '#f3f4f6'}
            textColor={resolutionMetrics.backlogSize > 10 ? '#dc2626' : '#1f2937'}
          />
          <Column style={{ width: '8px' }} />
          <StatCard
            label="Pos / Neg Ratio"
            value={
              feedbackTrends.negativeCount > 0
                ? `${(feedbackTrends.positiveCount / feedbackTrends.negativeCount).toFixed(1)}:1`
                : feedbackTrends.positiveCount > 0
                  ? 'All +'
                  : 'N/A'
            }
            bgColor={
              feedbackTrends.negativeCount === 0 && feedbackTrends.positiveCount > 0
                ? '#dcfce7'
                : feedbackTrends.positiveCount / Math.max(feedbackTrends.negativeCount, 1) >= 2
                  ? '#dcfce7'
                  : '#fee2e2'
            }
          />
        </Row>
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: 'center' as const, marginTop: '8px' }}>
        <Link
          href={`${appUrl}/admin/feedback`}
          style={{
            display: 'inline-block',
            backgroundColor: '#ff6a1a',
            color: '#ffffff',
            padding: '12px 32px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          View Full Dashboard
        </Link>
      </Section>

      <Text
        style={{
          fontSize: '12px',
          color: '#9ca3af',
          textAlign: 'center' as const,
          marginTop: '24px',
        }}
      >
        Automated weekly digest from Sahara AI.
      </Text>
    </EmailLayout>
  );
}
