/**
 * Feedback Digest Email Template
 * Phase 73-04: Weekly feedback summary for admin
 *
 * Renders a branded weekly feedback digest email with signal counts,
 * positive/negative ratio, flagged sessions, top categories, and daily volume.
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

export interface FeedbackDigestProps {
  totalSignals: number;
  positiveCount: number;
  negativeCount: number;
  flaggedSessionCount: number;
  topCategories: Array<{ category: string; count: number }>;
  dailyVolume: Array<{ date: string; count: number }>;
  period: { from: string; to: string };
  appUrl?: string;
}

function StatCard({
  label,
  value,
  bgColor,
  textColor,
}: {
  label: string;
  value: string | number;
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
    </Column>
  );
}

export function FeedbackDigest(props: FeedbackDigestProps) {
  const {
    totalSignals,
    positiveCount,
    negativeCount,
    flaggedSessionCount,
    topCategories,
    dailyVolume,
    period,
    appUrl = '',
  } = props;

  const ratio =
    negativeCount > 0
      ? (positiveCount / negativeCount).toFixed(1)
      : positiveCount > 0
        ? 'all positive'
        : 'N/A';

  const ratioDisplay =
    ratio !== 'all positive' && ratio !== 'N/A' ? `${ratio}:1` : ratio;

  return (
    <EmailLayout
      previewText={`Sahara Feedback Digest: ${period.from} - ${period.to}`}
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
        Sahara Feedback Digest
      </Text>
      <Text
        style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: '0 0 24px 0',
        }}
      >
        Week of {period.from} to {period.to}
      </Text>

      {/* Summary stats */}
      <Section style={{ marginBottom: '24px' }}>
        <Row>
          <StatCard label="Total Signals" value={totalSignals} bgColor="#fff7ed" />
          <Column style={{ width: '8px' }} />
          <StatCard
            label="Pos / Neg"
            value={ratioDisplay}
            bgColor={
              ratio === 'all positive' || (ratio !== 'N/A' && parseFloat(ratio) >= 2)
                ? '#dcfce7'
                : ratio !== 'N/A' && parseFloat(ratio) < 1
                  ? '#fee2e2'
                  : '#f3f4f6'
            }
          />
          <Column style={{ width: '8px' }} />
          <StatCard
            label="Flagged Sessions"
            value={flaggedSessionCount}
            bgColor={flaggedSessionCount > 0 ? '#fee2e2' : '#f3f4f6'}
            textColor={flaggedSessionCount > 0 ? '#dc2626' : '#1f2937'}
          />
        </Row>
      </Section>

      {/* Top categories */}
      {topCategories.length > 0 && (
        <Section style={{ marginBottom: '24px' }}>
          <Text
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#1f2937',
              margin: '0 0 12px 0',
            }}
          >
            Top Categories
          </Text>
          {topCategories.map((cat, i) => (
            <Row key={i} style={{ marginBottom: '6px' }}>
              <Column style={{ width: '24px', verticalAlign: 'top' as const }}>
                <Text style={{ margin: 0, fontSize: '14px', color: '#ff6a1a' }}>
                  {i + 1}.
                </Text>
              </Column>
              <Column>
                <Text style={{ margin: 0, fontSize: '14px', color: '#1f2937' }}>
                  <strong>{cat.category.replace(/_/g, ' ')}</strong>
                  {' '}({cat.count})
                  {cat.category === 'coaching_discomfort' && (
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>
                      {' '}(working as designed)
                    </span>
                  )}
                </Text>
              </Column>
            </Row>
          ))}
        </Section>
      )}

      {/* Daily volume */}
      {dailyVolume.length > 0 && (
        <Section style={{ marginBottom: '24px' }}>
          <Text
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#1f2937',
              margin: '0 0 12px 0',
            }}
          >
            Daily Volume
          </Text>
          <Section
            style={{
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              padding: '12px 16px',
            }}
          >
            {dailyVolume.map((day, i) => {
              const maxCount = Math.max(...dailyVolume.map((d) => d.count), 1);
              const barWidth = Math.round((day.count / maxCount) * 100);
              return (
                <Row key={i} style={{ marginBottom: i < dailyVolume.length - 1 ? '4px' : '0' }}>
                  <Column style={{ width: '90px' }}>
                    <Text
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#6b7280',
                        fontFamily: 'monospace',
                      }}
                    >
                      {day.date}
                    </Text>
                  </Column>
                  <Column>
                    <Text style={{ margin: 0, fontSize: '12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#ff6a1a',
                          height: '14px',
                          width: `${Math.max(barWidth, 2)}%`,
                          borderRadius: '2px',
                          verticalAlign: 'middle',
                        }}
                      />
                      <span style={{ marginLeft: '6px', color: '#374151', fontSize: '12px' }}>
                        {day.count}
                      </span>
                    </Text>
                  </Column>
                </Row>
              );
            })}
          </Section>
        </Section>
      )}

      <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 24px 0' }} />

      {/* CTA button */}
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

      {/* Footer note */}
      <Text
        style={{
          fontSize: '12px',
          color: '#9ca3af',
          textAlign: 'center' as const,
          marginTop: '24px',
        }}
      >
        This is an automated weekly digest from Sahara.
      </Text>
    </EmailLayout>
  );
}
