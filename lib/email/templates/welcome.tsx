/**
 * Welcome Email Template
 * Sent to new users after successful signup/onboarding.
 *
 * Introduces Fred, sets expectations for the journey,
 * and provides a clear CTA to start their first conversation.
 */

import {
  Section,
  Text,
  Link,
  Button,
  Hr,
} from '@react-email/components';
import { EmailLayout } from './layout';

interface WelcomeEmailProps {
  founderName: string;
  appUrl: string;
}

export function WelcomeEmail({ founderName, appUrl }: WelcomeEmailProps) {
  const chatUrl = `${appUrl}/dashboard`;
  const name = founderName || 'Founder';

  return (
    <EmailLayout
      previewText={`Welcome to Sahara, ${name} — your founder journey starts now`}
      appUrl={appUrl}
    >
      <Section style={{ padding: '0 24px' }}>
        <Text style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          Welcome to Sahara, {name}
        </Text>

        <Text style={{ fontSize: '16px', color: '#4b5563', lineHeight: '1.6' }}>
          I'm Fred Cary — serial entrepreneur, startup mentor, and the AI behind Sahara.
          I've built and exited 22 companies, taken 3 public, and helped thousands of founders
          navigate the messy reality of building something from nothing.
        </Text>

        <Text style={{ fontSize: '16px', color: '#4b5563', lineHeight: '1.6' }}>
          Here's what happens next:
        </Text>

        <Section style={{ padding: '16px', backgroundColor: '#fff7ed', borderRadius: '8px', marginBottom: '16px' }}>
          <Text style={{ fontSize: '15px', color: '#9a3412', margin: '0 0 8px 0', fontWeight: 600 }}>
            Your Journey with Sahara
          </Text>
          <Text style={{ fontSize: '14px', color: '#78350f', margin: '0 0 4px 0' }}>
            1. Start a conversation with me — I'll learn about you and your venture
          </Text>
          <Text style={{ fontSize: '14px', color: '#78350f', margin: '0 0 4px 0' }}>
            2. Complete your Reality Lens — an honest assessment of where you stand
          </Text>
          <Text style={{ fontSize: '14px', color: '#78350f', margin: '0 0 4px 0' }}>
            3. Follow the structured journey from Discovery through Seed stage
          </Text>
          <Text style={{ fontSize: '14px', color: '#78350f', margin: '0' }}>
            4. Build investor-ready documents, pitch decks, and strategy plans
          </Text>
        </Section>

        <Text style={{ fontSize: '16px', color: '#4b5563', lineHeight: '1.6' }}>
          This isn't a chatbot — it's a mentorship. I'll challenge your assumptions,
          help you make better decisions, and keep you accountable. Think of me as the
          co-founder who's been through it before.
        </Text>

        <Section style={{ textAlign: 'center' as const, marginTop: '24px', marginBottom: '24px' }}>
          <Button
            href={chatUrl}
            style={{
              backgroundColor: '#ff6a1a',
              color: '#ffffff',
              padding: '14px 32px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Start Your First Conversation
          </Button>
        </Section>

        <Hr style={{ borderColor: '#e5e7eb', marginTop: '24px', marginBottom: '16px' }} />

        <Text style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.5' }}>
          You're receiving this because you signed up for{' '}
          <Link href={appUrl} style={{ color: '#ff6a1a' }}>Sahara</Link>.
          If you have questions, reply to this email or chat with me directly on the platform.
        </Text>
      </Section>
    </EmailLayout>
  );
}
