"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Lightbulb,
  Target,
  Users,
  Zap,
  Rocket,
  BarChart,
  Play,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type StartupStep =
  | "problem"
  | "buyer"
  | "founder-edge"
  | "solution"
  | "validation"
  | "gtm"
  | "execution"
  | "pilot"
  | "scale-decision";

type StepStatus = "not_started" | "in_progress" | "validated" | "blocked";

interface StepData {
  response: string;
  status: StepStatus;
  blockers: string[];
}

const STEPS: {
  id: StartupStep;
  name: string;
  shortName: string;
  icon: React.ElementType;
  objective: string;
  questions: string[];
  requiredOutput: string;
  doNotAdvanceIf: string[];
}[] = [
  {
    id: "problem",
    name: "Define the Real Problem",
    shortName: "Problem",
    icon: Target,
    objective:
      "Clearly articulate the problem being solved, separate from any solution.",
    questions: [
      "Who specifically experiences this problem?",
      "How often does it occur?",
      "Why does it matter enough to change behavior or spend money?",
    ],
    requiredOutput:
      "A one-sentence problem statement written in the customer's language.",
    doNotAdvanceIf: [
      "The problem is vague, abstract, or generic",
      "The problem sounds like a feature description",
    ],
  },
  {
    id: "buyer",
    name: "Identify the Buyer",
    shortName: "Buyer",
    icon: Users,
    objective:
      "Clarify who buys, who uses, and the context in which the problem exists.",
    questions: [
      "Who is the economic buyer?",
      "Who is the user (if different)?",
      "What environment or workflow does this live in?",
    ],
    requiredOutput:
      "A clear definition of buyer vs user. The environment where the solution must fit.",
    doNotAdvanceIf: [
      '"Everyone" is the target',
      "The buyer is unclear or hypothetical",
    ],
  },
  {
    id: "founder-edge",
    name: "Founder Edge",
    shortName: "Edge",
    icon: Zap,
    objective:
      "Understand why this founder is credible to solve this problem.",
    questions: [
      "What lived experience, insight, or unfair advantage exists?",
      "What do you know that others don't?",
    ],
    requiredOutput: "A concise statement of founder-market fit.",
    doNotAdvanceIf: [
      "No credible path to insight, access, or learning velocity",
    ],
  },
  {
    id: "solution",
    name: "Simplest Viable Solution",
    shortName: "Solution",
    icon: Lightbulb,
    objective:
      "Articulate the smallest solution that meaningfully solves the core problem.",
    questions: [
      "What is the simplest version that delivers value?",
      "What is explicitly not included yet?",
    ],
    requiredOutput: "A plain-English description of the first solution.",
    doNotAdvanceIf: [
      "The solution is overbuilt or unfocused",
      "Tries to solve multiple problems at once",
    ],
  },
  {
    id: "validation",
    name: "Validate Before Building",
    shortName: "Validation",
    icon: CheckCircle2,
    objective:
      "Test demand, willingness to pay, and behavior before heavy build-out.",
    questions: [
      "What is the fastest/cheapest way to test this?",
      "What signal would prove this problem is real?",
    ],
    requiredOutput:
      "Evidence of demand (conversations, LOIs, pilots, pre-orders, usage).",
    doNotAdvanceIf: [
      "Validation is theoretical",
      "No real user or buyer interaction has occurred",
    ],
  },
  {
    id: "gtm",
    name: "Go-To-Market Motion",
    shortName: "GTM",
    icon: Rocket,
    objective: "Identify how the first customers will actually be reached.",
    questions: [
      "How does this reach buyers in practice?",
      "What channel works now, not later?",
    ],
    requiredOutput: "One clear initial distribution path.",
    doNotAdvanceIf: [
      "Distribution is hand-waved",
      "GTM depends on scale, brand, or future capital",
    ],
  },
  {
    id: "execution",
    name: "Execution Discipline",
    shortName: "Execution",
    icon: BarChart,
    objective: "Create focus and momentum through simple execution cadence.",
    questions: [
      "What matters this week?",
      "What decision cannot be avoided?",
    ],
    requiredOutput: "Weekly priorities. Clear ownership.",
    doNotAdvanceIf: ["Work is reactive or scattered"],
  },
  {
    id: "pilot",
    name: "Contained Pilot",
    shortName: "Pilot",
    icon: Play,
    objective: "Operate a small, real-world test of the solution.",
    questions: [
      "What does success look like in a pilot?",
      "What will we measure?",
    ],
    requiredOutput:
      "Pilot results with qualitative and quantitative feedback.",
    doNotAdvanceIf: ["Results are inconclusive or ignored"],
  },
  {
    id: "scale-decision",
    name: "Scale Decision",
    shortName: "Scale",
    icon: Scale,
    objective: "Determine whether to double down, iterate, or stop.",
    questions: [
      "What worked?",
      "What didn't?",
      "What must be true before scaling or fundraising?",
    ],
    requiredOutput: "A clear decision: proceed, adjust, or stop.",
    doNotAdvanceIf: ["Decisions are based on hope instead of evidence"],
  },
];

interface StartupProcessWizardProps {
  onComplete?: (data: Record<StartupStep, StepData>) => void;
  initialStep?: number;
}

export function StartupProcessWizard({
  onComplete,
  initialStep = 0,
}: StartupProcessWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStep);
  const [stepData, setStepData] = useState<Record<StartupStep, StepData>>(
    () => {
      const initial: Record<string, StepData> = {};
      STEPS.forEach((step, i) => {
        initial[step.id] = {
          response: "",
          status: i === 0 ? "in_progress" : "not_started",
          blockers: [],
        };
      });
      return initial as Record<StartupStep, StepData>;
    }
  );

  const currentStep = STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      // Mark current as validated, next as in_progress
      setStepData((prev) => ({
        ...prev,
        [currentStep.id]: { ...prev[currentStep.id], status: "validated" },
        [STEPS[currentStepIndex + 1].id]: {
          ...prev[STEPS[currentStepIndex + 1].id],
          status: "in_progress",
        },
      }));
      setCurrentStepIndex(currentStepIndex + 1);
    } else if (onComplete) {
      setStepData((prev) => ({
        ...prev,
        [currentStep.id]: { ...prev[currentStep.id], status: "validated" },
      }));
      onComplete(stepData);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleResponseChange = (value: string) => {
    setStepData((prev) => ({
      ...prev,
      [currentStep.id]: { ...prev[currentStep.id], response: value },
    }));
  };

  const getStepIcon = (step: (typeof STEPS)[0], index: number) => {
    const data = stepData[step.id];
    const Icon = step.icon;

    if (data.status === "validated") {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
    if (data.status === "blocked") {
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    }
    if (index === currentStepIndex) {
      return <Icon className="w-5 h-5 text-primary" />;
    }
    return <Circle className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Startup Process</h2>
          <Badge variant="outline">
            Step {currentStepIndex + 1} of {STEPS.length}
          </Badge>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step Navigation */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {STEPS.map((step, index) => (
          <button
            key={step.id}
            onClick={() => {
              if (stepData[step.id].status !== "not_started") {
                setCurrentStepIndex(index);
              }
            }}
            disabled={stepData[step.id].status === "not_started"}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap",
              index === currentStepIndex
                ? "bg-primary text-primary-foreground"
                : stepData[step.id].status === "validated"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : stepData[step.id].status === "not_started"
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {getStepIcon(step, index)}
            <span className="text-sm font-medium">{step.shortName}</span>
          </button>
        ))}
      </div>

      {/* Current Step Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <currentStep.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{currentStep.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentStep.objective}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Questions */}
              <div>
                <h4 className="font-semibold mb-3">Key Questions</h4>
                <ul className="space-y-2">
                  {currentStep.questions.map((question, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-muted-foreground"
                    >
                      <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Response Input */}
              <div>
                <h4 className="font-semibold mb-3">Your Response</h4>
                <Textarea
                  value={stepData[currentStep.id].response}
                  onChange={(e) => handleResponseChange(e.target.value)}
                  placeholder={`Required output: ${currentStep.requiredOutput}`}
                  className="min-h-[150px]"
                />
              </div>

              {/* Warning Box */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-amber-800 dark:text-amber-200">
                      Do Not Advance If:
                    </h5>
                    <ul className="mt-2 space-y-1">
                      {currentStep.doNotAdvanceIf.map((warning, i) => (
                        <li
                          key={i}
                          className="text-sm text-amber-700 dark:text-amber-300"
                        >
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStepIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!stepData[currentStep.id].response.trim()}
                >
                  {currentStepIndex === STEPS.length - 1
                    ? "Complete"
                    : "Next Step"}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
