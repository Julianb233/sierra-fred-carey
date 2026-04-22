export interface IntakeQuestion {
  id: string
  question: string
  placeholder: string
  fredRephrase: string  // How FRED would summarize the answer
  memoryCategory: string
  memoryKey: string
  profileField?: string  // If answer maps to a profiles column
}

export interface IntakeAnswers {
  startup_idea: string
  current_stage: string
  biggest_challenge: string
  goals: string
  timeline_goal: string
}

export type IntakeStep = 'welcome' | 'intake' | 'processing' | 'complete'
