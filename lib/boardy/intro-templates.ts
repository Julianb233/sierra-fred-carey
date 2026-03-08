/**
 * Boardy Intro Templates
 * Phase 89: Boardy Polish
 *
 * Template generators for intro call scripts and email drafts.
 * Personalized based on match type (investor vs advisor) and focus area.
 */

// ============================================================================
// Types
// ============================================================================

interface MatchInfo {
  name: string
  type: string
  focus?: string
}

// ============================================================================
// Call Script Generator
// ============================================================================

/**
 * Generate a structured call script for an intro call with a match.
 * Personalizes based on match type (investor/advisor) and optional focus area.
 */
export function generateCallScript(match: MatchInfo): string {
  const isInvestor = match.type === "investor"
  const role = isInvestor ? "investor" : "advisor"
  const focusLine = match.focus
    ? ` with a focus on ${match.focus}`
    : ""

  return `## Call Script: Introduction with ${match.name}

### Opening (30 seconds)
"Hi ${match.name}, thanks for taking the time. We were connected through Sahara's matching platform${focusLine}. I appreciate you being open to this conversation."

### Your 30-Second Pitch
[Fill in your elevator pitch here]
- What you're building (one sentence)
- Who it's for and why they need it
- What traction you have so far

### Key Points to Cover
${isInvestor ? `- Your current revenue/traction metrics
- The market opportunity and why now
- Your fundraising goals and use of funds
- Your team's unique edge` : `- Where you are in your journey
- The specific challenge you're facing
- What kind of guidance would be most valuable
- Your timeline and key milestones`}

### Questions to Ask ${match.name}
1. "${isInvestor
    ? "What criteria do you typically look for at this stage?"
    : "What's the biggest mistake you see founders make at this stage?"}"
2. "${isInvestor
    ? "What would need to be true for you to consider investing?"
    : "Based on what I've shared, what would you prioritize?"}"
3. "${isInvestor
    ? "Who else in your network might be a good fit for what we're building?"
    : "Are there specific resources or connections that could accelerate our progress?"}"

### Closing
"Thank you for your time and insights. I'll follow up with [specific next step] by [specific date]. Looking forward to staying in touch."

---
*Tip: Keep the call under 30 minutes. ${role.charAt(0).toUpperCase() + role.slice(1)}s appreciate founders who are prepared, concise, and respectful of time.*`
}

// ============================================================================
// Email Template Generator
// ============================================================================

/**
 * Generate a fill-in-the-blank email template for reaching out to a match.
 * Keeps under 150 words -- investors and advisors prefer brevity.
 */
export function generateEmailTemplate(match: MatchInfo): string {
  const isInvestor = match.type === "investor"
  const focusLine = match.focus
    ? ` in ${match.focus}`
    : ""

  return `Subject: Introduction via Sahara -- [Your Company Name]

Hi ${match.name},

We were connected through Sahara's ${isInvestor ? "investor" : "advisor"} matching platform${focusLine}. I'm the founder of [Your Company], and we're [one sentence about what you do and for whom].

${isInvestor
    ? `We're currently [pre-revenue / generating $X MRR] with [key traction metric]. We're raising [amount] to [specific use of funds].`
    : `I'm at the [stage] and looking for guidance on [specific challenge]. Your experience in [their area of expertise] is exactly what I need.`}

Would you have 20 minutes this week for a quick call? I'm available [suggest 2-3 time slots].

Best,
[Your Name]
[Your Title], [Your Company]
[Your Phone / LinkedIn]

---
*Tips: Keep it under 150 words. Be specific about your ask. Make it easy to say yes.*`
}
