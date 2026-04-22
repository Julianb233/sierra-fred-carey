/**
 * Chat service for the funnel
 * Connects to the main Sahara API for consistent data storage
 * Falls back to a local demo mode if API is unavailable
 */

import { uid } from './utils'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const STORAGE_KEY = 'sahara-funnel-chat'
const SESSION_KEY = 'sahara-funnel-session'

/**
 * Get or create a session ID for this visitor
 */
export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID?.() || uid()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

/**
 * Load chat history from localStorage
 */
export function loadChatHistory(): ChatMessage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const messages = JSON.parse(stored)
    return messages.map((m: ChatMessage) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }))
  } catch {
    return []
  }
}

/**
 * Save chat history to localStorage
 */
export function saveChatHistory(messages: ChatMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch {
    // Storage full or unavailable — graceful degradation
  }
}

/**
 * Send a message to Fred and get a response
 * Uses the main Sahara API when available, falls back to demo responses
 */
export async function sendMessage(
  message: string,
  history: ChatMessage[],
  _onChunk?: (chunk: string) => void
): Promise<string> {
  const apiUrl = import.meta.env.VITE_SAHARA_API_URL

  // If we have a configured API URL, use the real API
  if (apiUrl) {
    try {
      const response = await fetch(`${apiUrl}/api/fred/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionId: getSessionId(),
          stream: false,
          context: { source: 'funnel' },
          pageContext: '/funnel',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return data.response || data.message || 'I apologize, I had trouble processing that. Could you try again?'
      }
    } catch {
      // Fall through to demo mode
    }
  }

  // Demo mode — intelligent local responses
  return generateDemoResponse(message, history)
}

/**
 * Generate contextual demo responses when API is unavailable
 * These cover common founder questions and guide users to the full platform
 */
function generateDemoResponse(message: string, _history: ChatMessage[]): string {
  const msg = message.toLowerCase()

  // Fundraising questions
  if (msg.includes('fundrais') || msg.includes('investor') || msg.includes('raise') || msg.includes('funding')) {
    return "Great question about fundraising. Here's my honest take: fundraising is a tool, not a goal. Before you think about raising, ask yourself:\n\n1. **Do you have product-market fit?** If not, raising money won't fix that.\n2. **What's your burn rate?** How long can you run without outside capital?\n3. **What would you do with the money?** If you can't answer specifically, you're not ready.\n\nOn the full Sahara platform, I can run a complete Investor Readiness Assessment and review your pitch deck. Want to explore that, or should we dig deeper into where you are right now?"
  }

  // Pitch deck
  if (msg.includes('pitch') || msg.includes('deck')) {
    return "A strong pitch deck tells a story in 10-12 slides:\n\n1. **Problem** — What pain exists?\n2. **Solution** — How you solve it\n3. **Market** — How big is the opportunity?\n4. **Traction** — What proof do you have?\n5. **Business Model** — How do you make money?\n6. **Team** — Why are you the ones to build this?\n\nThe #1 mistake I see? Founders lead with the solution instead of the problem. Investors need to feel the pain before they care about your fix.\n\nOn the full Sahara platform, I can do a detailed pitch deck review with scoring. For now — what stage is your deck at?"
  }

  // Stage/where to start
  if (msg.includes('start') || msg.includes('begin') || msg.includes('new') || msg.includes('idea')) {
    return "Love that you're getting started! Here's what I'd focus on in order:\n\n1. **Talk to 10+ potential customers** — Don't build anything until you've validated the problem exists and people will pay to solve it.\n2. **Write a one-page business brief** — Forces you to clarify your thinking.\n3. **Build a bare-bones MVP** — The simplest thing that solves the core problem.\n\nDon't overthink it. The best founders I've worked with moved fast, talked to customers constantly, and iterated based on feedback.\n\nCheck out the Founder Journey tab to see the full roadmap. What's your idea about?"
  }

  // Revenue/business model
  if (msg.includes('revenue') || msg.includes('business model') || msg.includes('monetiz') || msg.includes('pricing')) {
    return "The best business model is the one your customers are already asking for. Here are the most common for startups:\n\n- **SaaS/Subscription** — Recurring revenue, predictable, investors love it\n- **Marketplace** — Take rate on transactions (harder to start, powerful at scale)\n- **Usage-based** — Pay as you go (great for dev tools, APIs)\n- **Freemium** — Free tier to acquire, paid to convert\n\nMy advice: start with the simplest model that gets you to revenue fastest. You can always add complexity later. What type of product are you building?"
  }

  // Team
  if (msg.includes('team') || msg.includes('cofounder') || msg.includes('co-founder') || msg.includes('hire')) {
    return "Finding the right team is one of the hardest parts. Here's what I tell founders:\n\n- **Solo founding is fine** for early stages — don't take on a cofounder just because you feel you should\n- **Look for complementary skills** — if you're technical, find someone who can sell (and vice versa)\n- **Culture fit > resume** — especially in the first 5 hires\n\nThe full Sahara platform has virtual team agents (CTO, CMO, CFO) that can help bridge gaps while you're building your founding team. What specific role are you looking to fill?"
  }

  // Platform features
  if (msg.includes('sahara') || msg.includes('platform') || msg.includes('feature') || msg.includes('what can')) {
    return "Here's what Sahara offers to help founders like you:\n\n🧠 **AI Coaching (Free)** — That's me! I'm here to help you think through strategy, fundraising, and building.\n\n📊 **Investor Readiness Score** — Know exactly where you stand before approaching investors.\n\n📑 **Pitch Deck Review** — AI-powered analysis with actionable feedback.\n\n👥 **Virtual Team Agents** — AI-powered CTO, CMO, and CFO to help with decisions.\n\n🔍 **Reality Lens** — Validate your business across 5 critical dimensions.\n\nYou're currently on the lite version. Head to [joinsahara.com](https://joinsahara.com) for the full experience. What would be most helpful for you right now?"
  }

  // Greeting — only match explicit greetings, not words containing "hi"/"hey"
  if (/^(hi|hello|hey|howdy|yo|sup)\b/i.test(msg.trim()) || msg.length < 5) {
    return "Hey! Great to connect. I'm Fred — I've worked with thousands of founders across every stage from idea to exit.\n\nI'm here to help you think through your startup — whether that's validating an idea, building your MVP, preparing for fundraising, or scaling.\n\n**What are you working on?** Tell me about your startup and where you're at, and I'll give you my honest take."
  }

  // Default — engage with what they said and ask follow-up questions
  const responses = [
    "That's interesting — tell me more. Here's what I'd want to understand:\n\n1. **Who has this problem?** The more specific you can be about your customer, the better.\n2. **How are they solving it today?** If they're not, that might be a signal.\n3. **What's your unfair advantage?** Why you, why now?\n\nDon't worry about having perfect answers — just share what you're thinking and we'll work through it together.",
    "I like where your head is at. Let me ask you a few things:\n\nEvery startup challenge usually boils down to one of three things:\n- **Product** — Are you building something people want?\n- **Distribution** — Can you reach your customers efficiently?\n- **Economics** — Does the math work?\n\nWhich of these feels most relevant to where you are? Let's dig into it together.",
    "Good thinking. Let me share a quick framework:\n\n**The 3-Question Test:**\n1. If you stopped working on this tomorrow, would anyone notice? (Market pull)\n2. Can you explain what you do in one sentence? (Clarity)\n3. Do you know your next 3 moves? (Execution)\n\nNo pressure to have all the answers — that's what I'm here for. Which one feels like the biggest gap right now?",
  ]

  return responses[Math.floor(Math.random() * responses.length)]
}
