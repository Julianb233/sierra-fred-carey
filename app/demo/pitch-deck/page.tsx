"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  FileTextIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  RocketIcon,
  UploadIcon,
} from "@radix-ui/react-icons";

const mockSlides = [
  { name: "Title Slide", score: 92, feedback: "Clear and compelling headline" },
  { name: "Problem", score: 85, feedback: "Good problem framing, add market data" },
  { name: "Solution", score: 78, feedback: "Clarify unique differentiation" },
  { name: "Market Size", score: 65, feedback: "TAM calculation needs validation" },
  { name: "Business Model", score: 88, feedback: "Strong unit economics shown" },
  { name: "Traction", score: 72, feedback: "Add more specific metrics" },
  { name: "Team", score: 95, feedback: "Excellent domain expertise" },
  { name: "Ask", score: 60, feedback: "Use of funds could be clearer" },
];

const mockObjections = [
  {
    type: "critical",
    title: "Market Size Validation",
    description: "TAM of $50B seems inflated. Provide bottom-up calculation.",
    suggestion: "Use industry reports + customer interviews for realistic sizing.",
  },
  {
    type: "warning",
    title: "Competitive Landscape",
    description: "Missing key competitor analysis section.",
    suggestion: "Add 2x2 matrix showing your positioning vs alternatives.",
  },
  {
    type: "warning",
    title: "Go-to-Market Strategy",
    description: "CAC and LTV assumptions need more detail.",
    suggestion: "Show historical CAC trends and cohort analysis if available.",
  },
];

export default function PitchDeckDemo() {
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<boolean>(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    setResults(true);
    setAnalyzing(false);
  };

  const overallScore = 79;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
            Pro Feature
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            Pitch Deck Review
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Get AI-powered analysis of your pitch deck with slide-by-slide feedback,
            investor objection predictions, and rewrite suggestions.
          </p>
        </motion.div>

        {!results ? (
          /* Upload Section */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-8 border-dashed border-2 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <UploadIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  Upload Your Pitch Deck
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Supports PDF, PPTX, or Google Slides link
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-white px-8"
                  >
                    {analyzing ? (
                      <>Analyzing...</>
                    ) : (
                      <>
                        <FileTextIcon className="mr-2 h-4 w-4" />
                        Try Demo Analysis
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                  For this demo, we&apos;ll analyze a sample deck
                </p>
              </div>
            </Card>
          </motion.div>
        ) : (
          /* Results Section */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Overall Score */}
            <Card className="p-8 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Deck Score
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your deck is above average but has areas for improvement
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-6xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                    {overallScore}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">out of 100</p>
                </div>
              </div>
            </Card>

            {/* Slide-by-Slide Analysis */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Slide Analysis
              </h2>
              <div className="grid gap-4">
                {mockSlides.map((slide, index) => (
                  <motion.div
                    key={slide.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400">
                            {index + 1}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {slide.name}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            slide.score >= 80
                              ? "border-green-500 text-green-600 dark:text-green-400"
                              : slide.score >= 70
                              ? "border-amber-500 text-amber-600 dark:text-amber-400"
                              : "border-red-500 text-red-600 dark:text-red-400"
                          }
                        >
                          {slide.score}/100
                        </Badge>
                      </div>
                      <Progress
                        value={slide.score}
                        className="h-2 mb-2"
                        indicatorClassName={
                          slide.score >= 80
                            ? "bg-green-500"
                            : slide.score >= 70
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {slide.feedback}
                      </p>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Investor Objections */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Predicted Investor Objections
              </h2>
              <div className="space-y-4">
                {mockObjections.map((objection, index) => (
                  <motion.div
                    key={objection.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <Card className="p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-2 rounded-lg ${
                            objection.type === "critical"
                              ? "bg-red-100 dark:bg-red-900/30"
                              : "bg-amber-100 dark:bg-amber-900/30"
                          }`}
                        >
                          {objection.type === "critical" ? (
                            <CrossCircledIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                          ) : (
                            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {objection.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                            {objection.description}
                          </p>
                          <div className="flex items-start gap-2 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                            <CheckCircledIcon className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-green-800 dark:text-green-300">
                              {objection.suggestion}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Card className="p-8 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Ready to Perfect Your Pitch?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xl mx-auto">
                  Get detailed rewrite suggestions, comparison with successful decks,
                  and unlimited revisions with a Pro account.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild className="bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90">
                    <Link href="/get-started">
                      Start Free Trial
                      <RocketIcon className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="border-gray-300 dark:border-gray-700">
                    <Link href="/pricing">
                      View Pricing
                      <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
