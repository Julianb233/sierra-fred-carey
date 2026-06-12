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
  Img,
} from '@react-email/components';
import type { ReactNode } from 'react';

interface EmailLayoutProps {
  previewText: string;
  children: ReactNode;
  appUrl?: string;
}

const SAHARA_ORANGE = '#ff6a1a';
const SAHARA_DARK = '#111827';
const SAHARA_GRAY = '#6b7280';
const SAHARA_LIGHT_GRAY = '#9ca3af';

const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export function EmailLayout({ previewText, children, appUrl = '' }: EmailLayoutProps) {
  const settingsUrl = appUrl ? `${appUrl}/dashboard/settings` : '#';
  const logoUrl = appUrl ? `${appUrl}/sahara-logo.svg` : undefined;

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
          {/* Brand header with logo */}
          <Section
            style={{
              padding: '0 0 24px 0',
              textAlign: 'center' as const,
            }}
          >
            {logoUrl ? (
              <Img
                src={logoUrl}
                alt="Sahara"
                width={160}
                height={35}
                style={{
                  margin: '0 auto',
                  display: 'block',
                }}
              />
            ) : (
              <Text
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: SAHARA_ORANGE,
                  margin: 0,
                  letterSpacing: '-0.5px',
                }}
              >
                Sahara
              </Text>
            )}
            <Text
              style={{
                fontSize: '13px',
                color: SAHARA_GRAY,
                margin: '6px 0 0 0',
                letterSpacing: '0.3px',
              }}
            >
              AI-Powered Founder Operating System
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
            <Text style={{ fontSize: '12px', color: SAHARA_LIGHT_GRAY, margin: '0 0 8px 0' }}>
              You received this email because you have a Sahara account.
            </Text>
            <Text style={{ fontSize: '12px', color: SAHARA_LIGHT_GRAY, margin: 0 }}>
              <Link
                href={settingsUrl}
                style={{ color: SAHARA_GRAY, textDecoration: 'underline' }}
              >
                Manage email preferences
              </Link>
              {' · '}
              <Link
                href={appUrl || '#'}
                style={{ color: SAHARA_GRAY, textDecoration: 'underline' }}
              >
                Visit Sahara
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
