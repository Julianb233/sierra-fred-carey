"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Rocket } from "lucide-react";
import { StartupProcessWizard } from "@/components/startup-process";
import { toast } from "sonner";
import type {
  StartupProcess,
  StepNumber,
  StepData,
  ValidationResult,
  ProcessStep,
} from "@/types/startup-process";
import {
  STEP_TITLES,
  STEP_DESCRIPTIONS,
  STEP_KEY_QUESTIONS,
} from "@/types/startup-process";

// Create initial empty process
function createInitialProcess(): StartupProcess {
  const steps: ProcessStep[] = [];
  for (let i = 1; i <= 9; i++) {
    const stepNumber = i as StepNumber;
    steps.push({
      stepNumber,
      title: STEP_TITLES[stepNumber],
      description: STEP_DESCRIPTIONS[stepNumber],
      status: i === 1 ? "in_progress" : "not_started",
      data: null,
      validation: null,
      keyQuestions: STEP_KEY_QUESTIONS[stepNumber],
    });
  }

  return {
    id: `process_${Date.now()}`,
    userId: "",
    currentStep: 1,
    steps,
    overallProgress: 0,
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };
}

// Validate a step using FRED's analysis engine
async function validateStep(
  stepNumber: StepNumber,
  data: StepData | null
): Promise<ValidationResult> {
  if (!data) {
    return {
      status: "blocked",
      feedback: "Please fill in all required fields before validating.",
      blockerReasons: ["Required fields are empty"],
    };
  }

  try {
    const response = await fetch("/api/fred/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "step_validation",
        context: {
          stepNumber,
          stepTitle: STEP_TITLES[stepNumber],
          stepDescription: STEP_DESCRIPTIONS[stepNumber],
          keyQuestions: STEP_KEY_QUESTIONS[stepNumber],
          userResponses: data,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Validation request failed");
    }

    const result = await response.json();

    return {
      status: result.status || "needs_work",
      feedback: result.feedback || "Analysis complete. Review the suggestions below.",
      suggestions: result.suggestions || [],
      blockerReasons: result.blockerReasons,
      validatedAt: result.status === "pass" ? new Date().toISOString() : undefined,
    };
  } catch (err) {
    console.error("[StartupProcess] Validation error:", err);
    return {
      status: "needs_work",
      feedback: "Unable to validate with AI right now. Please review your answers and try again.",
      suggestions: [
        "Ensure all key questions are addressed",
        "Be specific and include supporting data where possible",
      ],
    };
  }
}

export default function StartupProcessPage() {
  const [process, setProcess] = useState<StartupProcess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load process data
  useEffect(() => {
    const loadProcess = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Try to load from localStorage first
        const savedProcess = localStorage.getItem("startup_process");
        if (savedProcess) {
          const parsed = JSON.parse(savedProcess);
          setProcess(parsed);
        } else {
          // Create new process
          setProcess(createInitialProcess());
        }
      } catch (err) {
        console.error("Error loading startup process:", err);
        // Create new process on error
        setProcess(createInitialProcess());
      } finally {
        setIsLoading(false);
      }
    };

    loadProcess();
  }, []);

  // Calculate overall progress
  const calculateProgress = useCallback((steps: ProcessStep[]): number => {
    const validatedSteps = steps.filter((s) => s.status === "validated").length;
    return Math.round((validatedSteps / 9) * 100);
  }, []);

  // Handle step change
  const handleStepChange = useCallback((stepNumber: StepNumber) => {
    setProcess((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentStep: stepNumber,
        lastActivityAt: new Date().toISOString(),
      };
    });
  }, []);

  // Handle data change
  const handleDataChange = useCallback(
    (stepNumber: StepNumber, data: StepData) => {
      setProcess((prev) => {
        if (!prev) return prev;

        const newSteps = prev.steps.map((step) => {
          if (step.stepNumber === stepNumber) {
            return {
              ...step,
              data,
              status: step.status === "not_started" ? "in_progress" : step.status,
              updatedAt: new Date().toISOString(),
            } as ProcessStep;
          }
          return step;
        });

        return {
          ...prev,
          steps: newSteps,
          lastActivityAt: new Date().toISOString(),
        };
      });
      setHasUnsavedChanges(true);
    },
    []
  );

  // Handle validation
  const handleValidate = useCallback(
    async (stepNumber: StepNumber): Promise<ValidationResult> => {
      if (!process) {
        return {
          status: "blocked",
          feedback: "Process not loaded",
          blockerReasons: ["Unable to validate"],
        };
      }

      const step = process.steps.find((s) => s.stepNumber === stepNumber);
      const result = await validateStep(stepNumber, step?.data ?? null);

      setProcess((prev) => {
        if (!prev) return prev;

        const newSteps = prev.steps.map((s) => {
          if (s.stepNumber === stepNumber) {
            return {
              ...s,
              validation: result,
              status:
                result.status === "pass"
                  ? "validated"
                  : result.status === "blocked"
                  ? "blocked"
                  : "in_progress",
              completedAt:
                result.status === "pass" ? new Date().toISOString() : undefined,
            } as ProcessStep;
          }
          // If current step is validated, mark next step as in_progress
          if (
            result.status === "pass" &&
            s.stepNumber === stepNumber + 1 &&
            s.status === "not_started"
          ) {
            return { ...s, status: "in_progress" } as ProcessStep;
          }
          return s;
        });

        const newProgress = calculateProgress(newSteps);
        const isComplete = newSteps.every((s) => s.status === "validated");

        return {
          ...prev,
          steps: newSteps,
          overallProgress: newProgress,
          lastActivityAt: new Date().toISOString(),
          completedAt: isComplete ? new Date().toISOString() : undefined,
        };
      });

      setHasUnsavedChanges(true);

      if (result.status === "pass") {
        toast.success("Step validated successfully");
      } else if (result.status === "blocked") {
        toast.error(result.feedback || "Validation blocked");
      } else {
        toast.info(result.feedback || "Step needs improvement");
      }

      return result;
    },
    [process, calculateProgress]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (!process) return;

    try {
      // Save to localStorage
      localStorage.setItem("startup_process", JSON.stringify(process));
      setHasUnsavedChanges(false);
      toast.success("Draft saved");
    } catch (err) {
      console.error("Error saving process:", err);
      toast.error("Failed to save draft");
      throw err;
    }
  }, [process]);

  // Auto-save on changes
  useEffect(() => {
    if (hasUnsavedChanges && process) {
      const timeout = setTimeout(() => {
        localStorage.setItem("startup_process", JSON.stringify(process));
        setHasUnsavedChanges(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [hasUnsavedChanges, process]);

  // Warn on unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#ff6a1a] mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your startup process...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900">
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 dark:text-red-300 mb-2 font-semibold">
            Unable to load startup process
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="border-red-300 hover:bg-red-100"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!process) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Rocket className="h-12 w-12 text-[#ff6a1a] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Start Your Journey</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            The 9-Step Startup Process will guide you through building a solid
            foundation for your startup idea.
          </p>
          <Button
            onClick={() => setProcess(createInitialProcess())}
            className="bg-[#ff6a1a] hover:bg-[#ea580c]"
          >
            <Rocket className="mr-2 h-4 w-4" />
            Begin Process
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <StartupProcessWizard
      process={process}
      onStepChange={handleStepChange}
      onDataChange={handleDataChange}
      onValidate={handleValidate}
      onSave={handleSave}
    />
  );
}
