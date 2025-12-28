"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { XIcon, ThumbsUpIcon, ThumbsDownIcon, StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingPromptProps {
  responseId: string;
  onRated?: (rating: number) => void;
  variant?: "thumbs" | "stars";
}

export function RatingPrompt({
  responseId,
  onRated,
  variant = "stars",
}: RatingPromptProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  async function handleSubmit() {
    if (rating === null) return;

    try {
      const response = await fetch("/api/ai/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId,
          rating,
          feedbackType,
          feedback: feedback.trim() || null,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        onRated?.(rating);

        // Auto-dismiss after 2 seconds
        setTimeout(() => {
          setDismissed(true);
        }, 2000);
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  }

  function handleRatingSelect(value: number) {
    setRating(value);
    setShowFeedback(true);
  }

  if (dismissed) {
    return null;
  }

  if (submitted) {
    return (
      <Card className="p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
        <p className="text-sm text-green-800 dark:text-green-200 text-center">
          Thank you for your feedback!
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          How helpful was this response?
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {variant === "thumbs" ? (
        <div className="flex gap-2">
          <Button
            variant={rating === 5 ? "orange" : "outline"}
            size="sm"
            onClick={() => handleRatingSelect(5)}
            className="flex-1"
          >
            <ThumbsUpIcon className="h-4 w-4 mr-2" />
            Helpful
          </Button>
          <Button
            variant={rating === 1 ? "destructive" : "outline"}
            size="sm"
            onClick={() => handleRatingSelect(1)}
            className="flex-1"
          >
            <ThumbsDownIcon className="h-4 w-4 mr-2" />
            Not Helpful
          </Button>
        </div>
      ) : (
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRatingSelect(star)}
              className={cn(
                "transition-colors hover:text-[#ff6a1a]",
                rating !== null && star <= rating
                  ? "text-[#ff6a1a]"
                  : "text-gray-300 dark:text-gray-600"
              )}
            >
              <StarIcon
                className="h-6 w-6"
                fill={rating !== null && star <= rating ? "currentColor" : "none"}
              />
            </button>
          ))}
        </div>
      )}

      {showFeedback && (
        <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-wrap gap-2">
            {[
              { value: "helpful", label: "Helpful" },
              { value: "accurate", label: "Accurate" },
              { value: "unclear", label: "Unclear" },
              { value: "wrong", label: "Incorrect" },
              { value: "incomplete", label: "Incomplete" },
            ].map((option) => (
              <Button
                key={option.value}
                variant={feedbackType === option.value ? "orange" : "outline"}
                size="sm"
                onClick={() => setFeedbackType(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <Textarea
            placeholder="Additional feedback (optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="min-h-[80px] text-sm"
          />

          <Button
            onClick={handleSubmit}
            variant="orange"
            size="sm"
            className="w-full"
            disabled={rating === null}
          >
            Submit Feedback
          </Button>
        </div>
      )}
    </Card>
  );
}
