"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  QUICK_QUESTIONS,
  type QuickAnswers,
  type QuickQuestion,
} from "@/lib/fred/reality-lens-quick";

// ============================================================================
// Types
// ============================================================================

interface QuickAssessmentResult {
  overallScore: number;
  stage: string;
  gaps: string[];
  strengths: string[];
  nextAction: string;
  verdictLabel: string;
}

const STAGE_LABELS: Record<string, string> = {
  clarity: "Clarity",
  validation: "Validation",
  build: "Build",
  launch: "Launch",
  grow: "Grow",
};

const STAGE_DESCRIPTIONS: Record<string, string> = {
  clarity:
    "Define your vision, identify your customer, and clarify your value proposition.",
  validation:
    "Test your assumptions with real customers and validate product-market fit.",
  build:
    "Build your MVP, set up key metrics, and prepare for your first users.",
  launch:
    "Go to market, acquire your first customers, and start generating revenue.",
  grow: "Scale your operations, optimize unit economics, and raise funding.",
};

const LOADING_MESSAGES = [
  "Evaluating your idea...",
  "Analyzing market fit...",
  "Assessing readiness...",
  "Mapping your journey stage...",
  "Generating insights...",
];

// ============================================================================
// Component
// ============================================================================

export default function QuickRealityLensPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [result, setResult] = useState<QuickAssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check if user already completed reality lens
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/fred/reality-lens/quick");
        const data = await res.json();
        if (data.success && data.data?.complete) {
          toast.info("You've already completed your reality check.");
          router.push("/dashboard");
          return;
        }
      } catch {
        // Non-blocking -- continue with assessment
      }
      setCheckingStatus(false);
    })();
  }, [router]);

  // Cycle loading messages
  useEffect(() => {
    if (!submitting) return;
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [submitting]);

  const totalQuestions = QUICK_QUESTIONS.length;
  const currentQuestion: QuickQuestion | undefined =
    QUICK_QUESTIONS[currentStep];
  const isLastQuestion = currentStep === totalQuestions - 1;
  const showResults = result !== null;

  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] || ""
    : "";

  const canProceed = currentAnswer.trim().length > 0;

  const handleNext = useCallback(() => {
    if (!canProceed) return;
    if (isLastQuestion) return;
    setDirection(1);
    setCurrentStep((prev) => prev + 1);
  }, [canProceed, isLastQuestion]);

  const handleBack = useCallback(() => {
    if (currentStep === 0) return;
    setDirection(-1);
    setCurrentStep((prev) => prev - 1);
  }, [currentStep]);

  const handleSubmit = async () => {
    if (!canProceed) return;
    setSubmitting(true);
    setError(null);
    setLoadingMessageIndex(0);

    const payload: QuickAnswers = {
      idea: answers.idea || "",
      targetCustomer: answers.targetCustomer || "",
      revenueModel: (answers.revenueModel as QuickAnswers["revenueModel"]) || "other",
      customerValidation:
        (answers.customerValidation as QuickAnswers["customerValidation"]) || "none",
      prototypeStage:
        (answers.prototypeStage as QuickAnswers["prototypeStage"]) || "idea-only",
      biggestChallenge: answers.biggestChallenge || "",
    };

    try {
      const res = await fetch("/api/fred/reality-lens/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg =
          typeof data.error === "object"
            ? data.error.message
            : data.error || "Assessment failed";
        throw new Error(msg);
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assessment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 75) return "bg-green-500/10 border-green-500/30";
    if (score >= 50) return "bg-amber-500/10 border-amber-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case "clarity":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "validation":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "build":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "launch":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "grow":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  // Show nothing while checking status
  if (checkingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-[#ff6a1a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Results Screen
  // -----------------------------------------------------------------------
  if (showResults && result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Your Reality Check Results
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here&apos;s where you stand -- and where to go next.
          </p>
        </div>

        {/* Overall Score */}
        <Card
          className={`p-8 text-center border-2 ${getScoreBgColor(result.overallScore)}`}
        >
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Readiness Score
          </p>
          <p
            className={`text-7xl font-bold mb-3 ${getScoreColor(result.overallScore)}`}
          >
            {result.overallScore}
          </p>
          <Badge className={`text-base px-4 py-1 ${getStageBadgeColor(result.stage)}`}>
            You&apos;re starting at: {STAGE_LABELS[result.stage] || result.stage}
          </Badge>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
            {STAGE_DESCRIPTIONS[result.stage] || ""}
          </p>
        </Card>

        {/* Gaps */}
        {result.gaps.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Here&apos;s what you need to figure out
            </h3>
            <ul className="space-y-2">
              {result.gaps.map((gap, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="text-red-500 mt-0.5 flex-shrink-0">
                    &#x2022;
                  </span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Strengths */}
        {result.strengths.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              What&apos;s working for you
            </h3>
            <ul className="space-y-2">
              {result.strengths.map((strength, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="text-green-500 mt-0.5 flex-shrink-0">
                    &#x2022;
                  </span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Next Action */}
        <Card className="p-6 bg-gradient-to-br from-[#ff6a1a]/10 to-orange-400/10 border-[#ff6a1a]/20">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Your #1 Next Step
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {result.nextAction}
          </p>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            onClick={() => router.push("/dashboard")}
            className="flex-1 bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
          >
            Continue to Dashboard
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push("/dashboard/reality-lens")}
            className="flex-1"
          >
            Get Detailed Analysis
          </Button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Loading / Submitting Screen
  // -----------------------------------------------------------------------
  if (submitting) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 border-4 border-[#ff6a1a]/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-[#ff6a1a] border-t-transparent rounded-full animate-spin" />
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={loadingMessageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-lg font-medium text-gray-700 dark:text-gray-300"
            >
              {LOADING_MESSAGES[loadingMessageIndex]}
            </motion.p>
          </AnimatePresence>
          <p className="text-sm text-gray-500">This usually takes 10-15 seconds</p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Question Flow
  // -----------------------------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Quick Reality Check
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Answer 6 quick questions and we&apos;ll assess your startup readiness.
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Question {currentStep + 1} of {totalQuestions}
          </span>
          <span className="text-gray-500">
            {Math.round(((currentStep + 1) / totalQuestions) * 100)}%
          </span>
        </div>
        <Progress
          value={((currentStep + 1) / totalQuestions) * 100}
          className="h-2"
        />
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, x: direction * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -50 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <Card className="p-8">
              <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {currentQuestion.question}
              </label>

              {currentQuestion.type === "text" ? (
                <Textarea
                  value={currentAnswer}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.id]: e.target.value,
                    }))
                  }
                  placeholder={currentQuestion.placeholder}
                  rows={4}
                  className="resize-none"
                  autoFocus
                />
              ) : (
                <Select
                  value={currentAnswer}
                  onValueChange={(val) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.id]: val,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentQuestion.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="text-gray-600"
        >
          Back
        </Button>

        {isLastQuestion ? (
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!canProceed}
            className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
          >
            Analyze My Idea
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleNext}
            disabled={!canProceed}
            className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
