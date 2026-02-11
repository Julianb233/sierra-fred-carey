/**
 * Types for the 9-Step Startup Process feature
 */

export type StepStatus = 'not_started' | 'in_progress' | 'validated' | 'blocked' | 'skipped' | 'assumed';

export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface ValidationResult {
  status: 'pass' | 'needs_work' | 'blocked';
  feedback: string;
  blockerReasons?: string[];
  suggestions?: string[];
  validatedAt?: string;
}

export interface Step1Data {
  problemStatement: string;
  who: string;
  frequency: string;
  urgency: string;
}

export interface Step2Data {
  economicBuyer: string;
  user: string;
  environment: string;
}

export interface Step3Data {
  founderEdge: string;
  uniqueInsight: string;
  unfairAdvantage: string;
}

export interface Step4Data {
  simplestSolution: string;
  explicitlyExcluded: string;
}

export interface Step5Data {
  validationMethod: string;
  evidence: string;
  customerQuotes?: string;
}

export interface Step6Data {
  gtmChannel: string;
  approach: string;
  initialTarget?: string;
}

export interface Step7Data {
  weeklyPriorities: string[];
  ownershipStructure: string;
  decisionMaker?: string;
}

export interface Step8Data {
  pilotDefinition: string;
  successCriteria: string;
  timeline?: string;
}

export interface Step9Data {
  whatWorked: string;
  whatDidntWork: string;
  scaleDecision: 'scale' | 'pivot' | 'kill' | 'iterate';
  nextSteps?: string;
}

export type StepData =
  | Step1Data
  | Step2Data
  | Step3Data
  | Step4Data
  | Step5Data
  | Step6Data
  | Step7Data
  | Step8Data
  | Step9Data;

export interface ProcessStep {
  stepNumber: StepNumber;
  title: string;
  description: string;
  status: StepStatus;
  data: StepData | null;
  validation: ValidationResult | null;
  keyQuestions: string[];
  completedAt?: string;
  updatedAt?: string;
}

export interface StartupProcess {
  id: string;
  userId: string;
  currentStep: StepNumber;
  steps: ProcessStep[];
  overallProgress: number;
  startedAt: string;
  lastActivityAt: string;
  completedAt?: string;
}

export const STEP_TITLES: Record<StepNumber, string> = {
  1: 'Define the Problem',
  2: 'Identify Your Customer',
  3: 'Your Founder Edge',
  4: 'Simplest Solution',
  5: 'Validate Demand',
  6: 'Go-to-Market Strategy',
  7: 'Weekly Execution',
  8: 'Pilot Program',
  9: 'Scale Decision',
};

export const STEP_DESCRIPTIONS: Record<StepNumber, string> = {
  1: 'Clearly articulate the problem you are solving and who experiences it most acutely.',
  2: 'Define who pays, who uses, and the environment where your solution operates.',
  3: 'Identify what makes you uniquely positioned to solve this problem.',
  4: 'Define the minimum viable solution and what you explicitly will not build.',
  5: 'Prove that real people will pay for your solution before building it.',
  6: 'Plan how you will reach your first customers efficiently.',
  7: 'Set clear weekly priorities and define who owns what decisions.',
  8: 'Design a focused pilot to test your assumptions with real users.',
  9: 'Analyze results and make a clear decision on next steps.',
};

export const STEP_KEY_QUESTIONS: Record<StepNumber, string[]> = {
  1: [
    'What specific problem are you solving?',
    'Who experiences this problem most acutely?',
    'How frequently do they encounter it?',
    'How urgent is the need for a solution?',
  ],
  2: [
    'Who is the economic buyer (who pays)?',
    'Who is the end user?',
    'What is their environment (B2B, B2C, enterprise, SMB)?',
  ],
  3: [
    'What is your unique founder edge?',
    'What insight do you have that others do not?',
    'What unfair advantage do you bring?',
  ],
  4: [
    'What is the simplest version that solves the core problem?',
    'What features are you explicitly NOT building?',
  ],
  5: [
    'How will you validate demand before building?',
    'What evidence will convince you to proceed?',
  ],
  6: [
    'What is your primary go-to-market channel?',
    'What is your acquisition approach?',
  ],
  7: [
    'What are your top 3 priorities this week?',
    'Who owns key decisions (product, tech, business)?',
  ],
  8: [
    'What does your pilot program look like?',
    'What are your success criteria?',
  ],
  9: [
    'What worked well?',
    'What did not work?',
    'Should you scale, pivot, iterate, or stop?',
  ],
};

export interface StepFormProps {
  stepNumber: StepNumber;
  data: StepData | null;
  onChange: (data: StepData) => void;
  disabled?: boolean;
}

export interface StepCardProps {
  step: ProcessStep;
  isActive: boolean;
  isAccessible: boolean;
  onClick?: () => void;
}

export interface ValidationFeedbackProps {
  validation: ValidationResult | null;
  stepNumber: StepNumber;
}

export interface ProcessOverviewProps {
  process: StartupProcess;
  onStepClick?: (stepNumber: StepNumber) => void;
}

export interface StartupProcessWizardProps {
  process: StartupProcess;
  onStepChange: (stepNumber: StepNumber) => void;
  onDataChange: (stepNumber: StepNumber, data: StepData) => void;
  onValidate: (stepNumber: StepNumber) => Promise<ValidationResult>;
  onSave: () => Promise<void>;
}
