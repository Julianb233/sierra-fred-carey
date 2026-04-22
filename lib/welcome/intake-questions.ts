import { IntakeQuestion } from './types'

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    id: 'startup_idea',
    question: "What's your startup idea or company?",
    placeholder: "Tell me about your venture in a few sentences...",
    fredRephrase: "So you're building {answer}. That's exciting -- let me understand where you are.",
    memoryCategory: 'startup_facts',
    memoryKey: 'company_description',
  },
  {
    id: 'current_stage',
    question: "What stage are you at?",
    placeholder: "Just an idea? Building an MVP? Already have customers?",
    fredRephrase: "Got it -- you're at the {answer} stage. That tells me exactly how to help.",
    memoryCategory: 'startup_facts',
    memoryKey: 'funding_stage',
    profileField: 'stage',
  },
  {
    id: 'biggest_challenge',
    question: "What's your biggest challenge right now?",
    placeholder: "What keeps you up at night about your startup?",
    fredRephrase: "Your #1 challenge is {answer}. We'll tackle that together.",
    memoryCategory: 'challenges',
    memoryKey: 'primary_challenge',
  },
  {
    id: 'goals',
    question: "What are your top goals for this venture?",
    placeholder: "What does success look like for you in the next 6-12 months?",
    fredRephrase: "Your goals: {answer}. Now I know exactly what we're aiming for.",
    memoryCategory: 'goals',
    memoryKey: 'venture_goals',
  },
  {
    id: 'timeline_goal',
    question: "What's your timeline or biggest goal?",
    placeholder: "Where do you want to be in 3, 6, or 12 months?",
    fredRephrase: "Your target: {answer}. Let's reverse-engineer a path to get there.",
    memoryCategory: 'goals',
    memoryKey: 'primary_timeline',
    profileField: 'venture_timeline',
  },
]
