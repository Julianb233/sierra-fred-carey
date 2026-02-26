/**
 * Sahara Funnel Constants
 * Aligned with main platform for easy data migration
 */

export const BRAND = {
  name: 'Sahara',
  tagline: 'AI-Powered Founder Operating System',
  color: '#ff6a1a',
  colorHover: '#ea580c',
  url: 'https://joinsahara.com',
  funnelUrl: 'https://u.joinsahara.com',
} as const

/**
 * Fred Cary — AI mentor persona
 */
export const FRED = {
  name: 'Fred',
  fullName: 'Fred Cary',
  title: 'AI Founder Coach',
  avatar: '🧠',
  greeting: "Hey! I'm Fred — your AI founder coach. I've helped thousands of entrepreneurs build, fund, and scale their startups. What's on your mind?",
  systemPrompt: `You are Fred Cary, an experienced startup mentor and founder coach. You help early-stage founders think clearly about their business, prepare for fundraising, and make better decisions.

Key traits:
- Direct but empathetic — you tell founders what they need to hear
- Practical — every answer includes actionable next steps
- Experienced — draw on patterns from thousands of startups
- Anti-hype — you never position fundraising as success by default

Keep responses concise (2-4 paragraphs max). Use conversational tone. If a founder seems stuck, ask clarifying questions. Always end with a clear next step or question.

You're currently chatting on the Sahara lite funnel (u.joinsahara.com). If users ask about advanced features (pitch deck review, investor readiness, virtual team agents), let them know those are available on the full Sahara platform at joinsahara.com.`,
} as const

/**
 * Founder Journey stages — matches main platform structure
 */
export const JOURNEY_STAGES = [
  {
    id: 'idea',
    title: 'Idea Stage',
    description: 'Validating your concept and finding problem-solution fit',
    icon: '💡',
    milestones: [
      'Define the problem you solve',
      'Identify your target customer',
      'Validate demand (10+ conversations)',
      'Create a one-page business brief',
    ],
  },
  {
    id: 'build',
    title: 'Build Stage',
    description: 'Creating your MVP and getting first users',
    icon: '🔨',
    milestones: [
      'Build an MVP (minimum viable product)',
      'Get 10 paying customers or active users',
      'Establish key metrics & KPIs',
      'Create a pitch deck draft',
    ],
  },
  {
    id: 'launch',
    title: 'Launch Stage',
    description: 'Going to market and finding product-market fit',
    icon: '🚀',
    milestones: [
      'Launch publicly',
      'Achieve consistent growth (10%+ MoM)',
      'Reach $1K MRR or 100 active users',
      'Refine your go-to-market strategy',
    ],
  },
  {
    id: 'scale',
    title: 'Scale Stage',
    description: 'Growing the team, revenue, and preparing to raise',
    icon: '📈',
    milestones: [
      'Hire first key team members',
      'Reach $10K+ MRR',
      'Complete investor readiness assessment',
      'Build investor pipeline',
    ],
  },
  {
    id: 'fund',
    title: 'Fund Stage',
    description: 'Raising capital to accelerate growth',
    icon: '💰',
    milestones: [
      'Finalize pitch deck with Fred',
      'Complete due diligence prep',
      'Secure term sheet',
      'Close your round',
    ],
  },
] as const

/**
 * FAQ items for the Sahara funnel
 */
export const FAQ_ITEMS = [
  {
    question: 'What is Sahara?',
    answer: 'Sahara is an AI-powered Founder Operating System built by Fred Cary. It helps startup founders with investor readiness scoring, pitch deck review, virtual team agents, and AI coaching — all designed to help you build, fund, and scale your startup.',
  },
  {
    question: 'Who is Fred?',
    answer: 'Fred Cary is an experienced entrepreneur and startup mentor who has helped thousands of founders build successful companies. On Sahara, Fred is your AI-powered coach who combines real-world founder experience with AI to give you personalized guidance.',
  },
  {
    question: 'Is this free to use?',
    answer: 'Yes! Chatting with Fred here on the lite version is completely free. When you\'re ready for advanced features like pitch deck reviews, investor readiness scoring, and virtual team agents, you can upgrade to the full Sahara platform.',
  },
  {
    question: 'How is this different from ChatGPT?',
    answer: 'Unlike generic AI, Fred is specifically trained on startup mentoring patterns from thousands of real founder interactions. He understands fundraising, go-to-market strategy, investor psychology, and the emotional journey of building a company. Every response is tailored to your stage and situation.',
  },
  {
    question: 'What can I do on the full platform?',
    answer: 'The full Sahara platform at joinsahara.com includes: AI investor readiness scoring, automated pitch deck review, virtual team agents (CTO, CMO, CFO), the Reality Lens validation framework, weekly coaching check-ins, and Boardy investor matching.',
  },
  {
    question: 'Will my data transfer to the full platform?',
    answer: 'Yes! When you sign up for the full Sahara platform, all your conversations with Fred and your founder journey progress will transfer seamlessly. Nothing is lost.',
  },
  {
    question: 'Is fundraising positioned as success?',
    answer: 'Never. Our core principle is that founders earn access to capital tooling by building real businesses first. Fred helps you understand if and when fundraising makes sense for your specific situation — many great companies never raise outside capital.',
  },
  {
    question: 'How do I get started?',
    answer: 'Just start chatting with Fred! Tell him about your startup, where you are in your journey, and what challenges you\'re facing. He\'ll guide you from there. No sign-up required to start.',
  },
] as const
