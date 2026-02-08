/**
 * Shared Email Layout Component
 * Phase 31: Email Engagement
 *
 * Sahara-branded email layout using @react-email/components.
 * All styles are inline (required for email client compatibility).
 */

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Preview,
} from '@react-email/components';
import type { ReactNode } from 'react';

interface EmailLayoutProps {
  previewText: string;
  children: ReactNode;
  appUrl?: string;
}

const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export function EmailLayout({ previewText, children, appUrl = '' }: EmailLayoutProps) {
  const settingsUrl = `${appUrl}/dashboard/settings`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body
        style={{
          backgroundColor: '#f9fafb',
          fontFamily,
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '40px 0',
          }}
        >
          {/* Brand header */}
          <Section style={{ padding: '0 0 24px 0', textAlign: 'center' as const }}>
            <Text
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#6366f1',
                margin: 0,
                letterSpacing: '-0.5px',
              }}
            >
              Sahara
            </Text>
          </Section>

          {/* Main content card */}
          <Section
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '40px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            {children}
          </Section>

          {/* Footer */}
          <Section style={{ textAlign: 'center' as const, padding: '24px 0' }}>
            <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 16px 0' }} />
            <Text style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
              <Link
                href={settingsUrl}
                style={{ color: '#6b7280', textDecoration: 'underline' }}
              >
                Manage email preferences
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
