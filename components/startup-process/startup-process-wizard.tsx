"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Loader2,
  Save,
  LayoutGrid,
  ListOrdered,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StepForm } from "./step-form";
import { StepCard } from "./step-card";
import { ValidationFeedback } from "./validation-feedback";
import { ProcessOverview } from "./process-overview";
import type {
  StartupProcessWizardProps,
  StepNumber,
  StepData,
  ProcessStep,
} from "@/types/startup-process";
import { STEP_TITLES, STEP_DESCRIPTIONS, STEP_KEY_QUESTIONS } from "@/types/startup-process";

export function StartupProcessWizard({
  process,
  onStepChange,
  onDataChange,
  onValidate,
  onSave,
}: StartupProcessWizardProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeView, setActiveView] = useState<"wizard" | "overview">("wizard");

  const currentStep = process.steps.find(
    (s) => s.stepNumber === process.currentStep
  );

  const canAdvance = useCallback(
    (stepNumber: StepNumber): boolean => {
      const step = process.steps.find((s) => s.stepNumber === stepNumber);
      if (!step) return false;
      return step.status === "validated";
    },
    [process.steps]
  );

  const isStepAccessible = useCallback(
    (stepNumber: StepNumber): boolean => {
      // First step is always accessible
      if (stepNumber === 1) return true;
      // Step is accessible if all previous steps are validated
      for (let i = 1; i < stepNumber; i++) {
        const prevStep = process.steps.find((s) => s.stepNumber === i);
        if (!prevStep || prevStep.status !== "validated") {
          return false;
        }
      }
      return true;
    },
    [process.steps]
  );

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      await onValidate(process.currentStep);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    if (process.currentStep > 1) {
      onStepChange((process.currentStep - 1) as StepNumber);
    }
  };

  const handleNext = () => {
    if (process.currentStep < 9 && canAdvance(process.currentStep)) {
      onStepChange((process.currentStep + 1) as StepNumber);
    }
  };

  const handleStepClick = (stepNumber: StepNumber) => {
    if (isStepAccessible(stepNumber)) {
      onStepChange(stepNumber);
    }
  };

  const handleDataChange = (data: StepData) => {
    onDataChange(process.currentStep, data);
  };

  // Check if current step has required fields filled
  const isCurrentStepComplete = (): boolean => {
    if (!currentStep?.data) return false;
    const d = currentStep.data as unknown as Record<string, unknown>;

    // Check required fields based on step number
    switch (process.currentStep) {
      case 1:
        return !!(d.problemStatement && d.who && d.frequency && d.urgency);
      case 2:
        return !!(d.economicBuyer && d.user && d.environment);
      case 3:
        return !!(d.founderEdge && d.uniqueInsight && d.unfairAdvantage);
      case 4:
        return !!(d.simplestSolution && d.explicitlyExcluded);
      case 5:
        return !!(d.validationMethod && d.evidence);
      case 6:
        return !!(d.gtmChannel && d.approach);
      case 7:
        return !!(
          Array.isArray(d.weeklyPriorities) &&
          (d.weeklyPriorities as string[]).some((p) => p.trim()) &&
          d.ownershipStructure
        );
      case 8:
        return !!(d.pilotDefinition && d.successCriteria);
      case 9:
        return !!(d.whatWorked && d.whatDidntWork && d.scaleDecision);
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">9-Step Startup Process</h1>
          <p className="text-muted-foreground mt-1">
            Build a strong foundation for your startup
          </p>
        </div>
        <Tabs
          value={activeView}
          onValueChange={(v) => setActiveView(v as "wizard" | "overview")}
        >
          <TabsList>
            <TabsTrigger value="wizard" className="gap-2">
              <ListOrdered className="h-4 w-4" />
              Wizard
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Overview
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {process.overallProgress}% Complete
            </span>
          </div>
          <Progress value={process.overallProgress} className="h-2" />
        </CardContent>
      </Card>

      {activeView === "overview" ? (
        <ProcessOverview process={process} onStepClick={handleStepClick} />
      ) : (
        <>
          {/* Step Indicator */}
          <div className="hidden lg:block">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  {process.steps.map((step, index) => {
                    const isAccessible = isStepAccessible(step.stepNumber);
                    const isCurrent = step.stepNumber === process.currentStep;

                    return (
                      <div key={step.stepNumber} className="flex items-center">
                        <button
                          onClick={() => handleStepClick(step.stepNumber)}
                          disabled={!isAccessible}
                          className={cn(
                            "flex flex-col items-center gap-1 transition-all",
                            isAccessible
                              ? "cursor-pointer hover:scale-105"
                              : "cursor-not-allowed opacity-40"
                          )}
                        >
                          <div
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all",
                              step.status === "validated"
                                ? "bg-green-500 text-white"
                                : step.status === "blocked"
                                ? "bg-amber-500 text-white"
                                : isCurrent
                                ? "bg-[#ff6a1a] text-white ring-4 ring-[#ff6a1a]/20"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                            )}
                          >
                            {step.status === "validated" ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : !isAccessible ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              step.stepNumber
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-xs text-center max-w-[90px] leading-tight line-clamp-2",
                              isCurrent
                                ? "text-[#ff6a1a] font-medium"
                                : "text-muted-foreground"
                            )}
                            title={STEP_TITLES[step.stepNumber]}
                          >
                            {STEP_TITLES[step.stepNumber]}
                          </span>
                        </button>
                        {index < 8 && (
                          <div
                            className={cn(
                              "w-8 h-1 mx-1 rounded-full transition-all",
                              step.status === "validated"
                                ? "bg-green-500"
                                : "bg-gray-200 dark:bg-gray-700"
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Step Indicator */}
          <div className="lg:hidden flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              disabled={process.currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <Badge
                variant="outline"
                className={cn(
                  "mb-1",
                  currentStep?.status === "validated"
                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                    : currentStep?.status === "blocked"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-[#ff6a1a]/10 text-[#ff6a1a] border-[#ff6a1a]/20"
                )}
              >
                Step {process.currentStep} of 9
              </Badge>
              <h2 className="font-semibold">
                {STEP_TITLES[process.currentStep]}
              </h2>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={
                process.currentStep === 9 || !canAdvance(process.currentStep)
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Step Form */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={process.currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-xl">
                            Step {process.currentStep}: {STEP_TITLES[process.currentStep]}
                          </CardTitle>
                          <p className="text-muted-foreground mt-1">
                            {STEP_DESCRIPTIONS[process.currentStep]}
                          </p>
                        </div>
                        {currentStep?.status === "validated" && (
                          <Badge className="bg-green-500 text-white shrink-0">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Validated
                          </Badge>
                        )}
                        {currentStep?.status === "blocked" && (
                          <Badge className="bg-amber-500 text-white shrink-0">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Needs Work
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <StepForm
                        stepNumber={process.currentStep}
                        data={currentStep?.data ?? null}
                        onChange={handleDataChange}
                        disabled={currentStep?.status === "validated"}
                      />

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-8 pt-6 border-t">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={handlePrevious}
                            disabled={process.currentStep === 1}
                            className="gap-1"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleSave}
                            disabled={isSaving || saveSuccess}
                            className="gap-1"
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : saveSuccess ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {saveSuccess ? "Saved!" : "Save Draft"}
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          {currentStep?.status !== "validated" && (
                            <Button
                              onClick={handleValidate}
                              disabled={!isCurrentStepComplete() || isValidating}
                              className="bg-[#ff6a1a] hover:bg-[#ea580c] gap-1"
                            >
                              {isValidating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                              Validate Step
                            </Button>
                          )}
                          {currentStep?.status === "validated" &&
                            process.currentStep < 9 && (
                              <Button
                                onClick={handleNext}
                                className="bg-green-600 hover:bg-green-700 gap-1"
                              >
                                Next Step
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Key Questions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Key Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {STEP_KEY_QUESTIONS[process.currentStep].map(
                      (question, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="text-[#ff6a1a] font-bold shrink-0">
                            {index + 1}.
                          </span>
                          <span>{question}</span>
                        </li>
                      )
                    )}
                  </ul>
                </CardContent>
              </Card>

              {/* Validation Feedback */}
              {currentStep?.validation && (
                <ValidationFeedback
                  validation={currentStep.validation}
                  stepNumber={process.currentStep}
                />
              )}

              {/* Step Navigation */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">All Steps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {process.steps.map((step) => {
                    const isAccessible = isStepAccessible(step.stepNumber);
                    return (
                      <button
                        key={step.stepNumber}
                        onClick={() => handleStepClick(step.stepNumber)}
                        disabled={!isAccessible}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all",
                          isAccessible
                            ? "hover:bg-accent cursor-pointer"
                            : "opacity-50 cursor-not-allowed",
                          step.stepNumber === process.currentStep &&
                            "bg-[#ff6a1a]/10 border border-[#ff6a1a]/20"
                        )}
                      >
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            step.status === "validated"
                              ? "bg-green-500 text-white"
                              : step.status === "blocked"
                              ? "bg-amber-500 text-white"
                              : step.stepNumber === process.currentStep
                              ? "bg-[#ff6a1a] text-white"
                              : "bg-gray-200 dark:bg-gray-700"
                          )}
                        >
                          {step.status === "validated" ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : !isAccessible ? (
                            <Lock className="h-3 w-3" />
                          ) : (
                            step.stepNumber
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-sm truncate",
                            step.stepNumber === process.currentStep
                              ? "font-medium text-[#ff6a1a]"
                              : ""
                          )}
                        >
                          {step.title}
                        </span>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
