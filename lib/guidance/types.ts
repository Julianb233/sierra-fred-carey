/**
 * Daily Mentor Guidance Types
 * Phase 84: Daily Agenda system types
 */

export interface DailyTask {
  id: string
  title: string
  description: string
  priority: "must-do" | "should-do" | "stretch"
  estimatedMinutes: number
  category: "research" | "build" | "connect" | "reflect" | "document"
  completed: boolean
}

export interface DailyAgenda {
  date: string
  tasks: DailyTask[]
  stage: string
  greeting: string
  completedCount: number
}
