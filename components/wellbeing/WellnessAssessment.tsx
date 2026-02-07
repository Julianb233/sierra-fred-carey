"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

// ============================================================================
// Types
// ============================================================================

interface WellnessQuestion {
  id: string;
  text: string;
  category: string;
  labels: { low: string; high: string };
}

interface WellnessAssessmentProps {
  onComplete: (score: number, answers: Record<string, number>) => void;
}

// ============================================================================
// Questions
// ============================================================================

const QUESTIONS: WellnessQuestion[] = [
  {
    id: "energy",
    text: "How would you rate your energy level over the past week?",
    category: "Energy Level",
    labels: { low: "Completely drained", high: "Fully energized" },
  },
  {
    id: "sleep",
    text: "How well have you been sleeping recently?",
    category: "Sleep Quality",
    labels: { low: "Very poorly", high: "Great sleep" },
  },
  {
    id: "stress",
    text: "How would you describe your stress level right now?",
    category: "Stress Level",
    labels: { low: "Overwhelming stress", high: "Calm and in control" },
  },
  {
    id: "motivation",
    text: "How motivated do you feel about your startup this week?",
    category: "Motivation",
    labels: { low: "No motivation at all", high: "Highly driven" },
  },
  {
    id: "connection",
    text: "How connected do you feel to people who support you?",
    category: "Social Connection",
    labels: { low: "Completely isolated", high: "Well supported" },
  },
  {
    id: "decisions",
    text: "How easy has it been to make decisions lately?",
    category: "Decision Fatigue",
    labels: { low: "Paralyzed by choices", high: "Deciding with clarity" },
  },
  {
    id: "balance",
    text: "How well are you balancing work with personal life?",
    category: "Work-Life Balance",
    labels: { low: "All work, no life", high: "Well balanced" },
  },
];

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;

// ============================================================================
// Result Helpers
// ============================================================================

function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBgColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Thriving";
  if (score >= 70) return "Doing Well";
  if (score >= 55) return "Holding Steady";
  if (score >= 40) return "Under Pressure";
  if (score >= 25) return "Struggling";
  return "Needs Attention";
}

function getFredRecommendation(score: number): string {
  if (score >= 70) {
    return "You're in a strong place right now -- and that's not luck, it's discipline. Keep doing what you're doing. The founders who maintain their health are the ones who last long enough to win. I've seen it over 50 years.";
  }
  if (score >= 40) {
    return "I can see you're feeling the weight of building something. That's normal. But 'normal' doesn't mean you should ignore it. After coaching 10,000+ founders, I can tell you: the ones who set boundaries and recharge are the ones who build things that last. Pick one thing this week to protect your energy.";
  }
  return "Listen, I've watched too many brilliant founders burn themselves into the ground. Your startup needs you healthy -- period. No strategy, no pitch deck, no investor meeting matters if you can't think straight. Take a step back today. Talk to someone. This isn't weakness; this is the smartest business decision you'll make this week.";
}

// ============================================================================
// Component
// ============================================================================

export function WellnessAssessment({ onComplete }: WellnessAssessmentProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === QUESTIONS.length;
  const progressPercent = (answeredCount / QUESTIONS.length) * 100;

  const handleAnswer = useCallback((questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!allAnswered) return;

    // Calculate score: each answer is 1-5, total possible = 5 * numQuestions
    // Normalize to 0-100 scale
    const totalPoints = Object.values(answers).reduce((sum, v) => sum + v, 0);
    const maxPoints = QUESTIONS.length * 5;
    const score = Math.round((totalPoints / maxPoints) * 100);

    setFinalScore(score);
    setShowResults(true);
    onComplete(score, answers);
  }, [allAnswered, answers, onComplete]);

  if (showResults) {
    return (
      <Card className="border-2 border-orange-200 dark:border-orange-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Your Wellness Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className={`text-6xl font-bold ${getScoreColor(finalScore)}`}>
              {finalScore}
            </div>
            <div className={`text-lg font-medium mt-1 ${getScoreColor(finalScore)}`}>
              {getScoreLabel(finalScore)}
            </div>
            <Progress
              value={finalScore}
              className="mt-4 h-3"
            />
          </div>

          <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-5 border border-orange-200 dark:border-orange-800">
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2">
              Fred&apos;s Take:
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
              &ldquo;{getFredRecommendation(finalScore)}&rdquo;
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {QUESTIONS.map((q) => {
              const answer = answers[q.id] ?? 0;
              return (
                <div
                  key={q.id}
                  className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-800/50 text-sm"
                >
                  <span className="text-gray-600 dark:text-gray-400">
                    {q.category}
                  </span>
                  <span
                    className={`font-medium ${
                      answer >= 4
                        ? "text-green-600"
                        : answer >= 3
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}
                  >
                    {answer}/5
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>
          {answeredCount} of {QUESTIONS.length} questions answered
        </span>
        <span>{Math.round(progressPercent)}%</span>
      </div>
      <Progress value={progressPercent} className="h-2" />

      <div className="space-y-4">
        {QUESTIONS.map((question) => (
          <Card
            key={question.id}
            className={`transition-all ${
              answers[question.id]
                ? "border-orange-300 dark:border-orange-700"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            <CardContent className="pt-5 pb-4">
              <Label className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3 block">
                {question.text}
              </Label>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{question.labels.low}</span>
                <span className="text-xs text-gray-400">{question.labels.high}</span>
              </div>
              <div className="flex gap-2">
                {SCORE_OPTIONS.map((value) => (
                  <button
                    key={value}
                    onClick={() => handleAnswer(question.id, value)}
                    className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
                      answers[question.id] === value
                        ? "bg-orange-500 text-white shadow-md"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!allAnswered}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        size="lg"
      >
        {allAnswered ? "See My Results" : `Answer ${QUESTIONS.length - answeredCount} more`}
      </Button>
    </div>
  );
}
