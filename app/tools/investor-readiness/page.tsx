"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScoreGauge } from "@/components/tools/ScoreGauge";
import { RadarChart } from "@/components/tools/RadarChart";
import { GlassCard3D } from "@/components/premium/Card3D";
import {
  ChevronRight,
  ChevronLeft,
  Download,
  CheckCircle2,
  Circle,
  RotateCcw,
} from "lucide-react";

const questions = [
  {
    id: 1,
    category: "Team",
    question: "Does your team have relevant industry experience?",
    options: [
      { text: "Extensive experience (10+ years)", score: 10 },
      { text: "Moderate experience (5-10 years)", score: 7 },
      { text: "Some experience (2-5 years)", score: 4 },
      { text: "Limited experience (<2 years)", score: 2 },
    ],
  },
  {
    id: 2,
    category: "Team",
    question: "Have team members successfully built products before?",
    options: [
      { text: "Multiple successful products", score: 10 },
      { text: "One successful product", score: 7 },
      { text: "Products launched but limited success", score: 4 },
      { text: "No prior product launches", score: 2 },
    ],
  },
  {
    id: 3,
    category: "Market",
    question: "What is your total addressable market (TAM)?",
    options: [
      { text: "$10B+ market", score: 10 },
      { text: "$1B-$10B market", score: 7 },
      { text: "$100M-$1B market", score: 4 },
      { text: "<$100M market", score: 2 },
    ],
  },
  {
    id: 4,
    category: "Market",
    question: "How competitive is your market?",
    options: [
      { text: "Blue ocean - minimal competition", score: 10 },
      { text: "Growing market with room for players", score: 7 },
      { text: "Competitive but differentiated", score: 5 },
      { text: "Highly saturated market", score: 2 },
    ],
  },
  {
    id: 5,
    category: "Product",
    question: "What is your product development stage?",
    options: [
      { text: "Launched with strong traction", score: 10 },
      { text: "MVP with early users", score: 7 },
      { text: "Working prototype", score: 4 },
      { text: "Concept stage only", score: 2 },
    ],
  },
  {
    id: 6,
    category: "Product",
    question: "Do you have a clear product roadmap?",
    options: [
      { text: "Detailed 12+ month roadmap", score: 10 },
      { text: "6-12 month roadmap", score: 7 },
      { text: "3-6 month plan", score: 4 },
      { text: "No formal roadmap", score: 2 },
    ],
  },
  {
    id: 7,
    category: "Financials",
    question: "What is your current monthly recurring revenue (MRR)?",
    options: [
      { text: "$50K+ MRR", score: 10 },
      { text: "$10K-$50K MRR", score: 7 },
      { text: "$1K-$10K MRR", score: 4 },
      { text: "Pre-revenue", score: 1 },
    ],
  },
  {
    id: 8,
    category: "Financials",
    question: "What is your runway?",
    options: [
      { text: "18+ months", score: 10 },
      { text: "12-18 months", score: 7 },
      { text: "6-12 months", score: 4 },
      { text: "<6 months", score: 1 },
    ],
  },
  {
    id: 9,
    category: "Traction",
    question: "What is your user/customer growth rate?",
    options: [
      { text: "20%+ monthly growth", score: 10 },
      { text: "10-20% monthly growth", score: 7 },
      { text: "5-10% monthly growth", score: 4 },
      { text: "<5% or negative growth", score: 2 },
    ],
  },
  {
    id: 10,
    category: "Traction",
    question: "Do you have strong unit economics?",
    options: [
      { text: "LTV/CAC > 3x with <12mo payback", score: 10 },
      { text: "LTV/CAC > 3x with >12mo payback", score: 7 },
      { text: "LTV/CAC 1-3x", score: 4 },
      { text: "Unclear or negative unit economics", score: 1 },
    ],
  },
];

export default function InvestorReadinessPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (score: number) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: score });

    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      setTimeout(() => setShowResults(true), 300);
    }
  };

  const calculateScores = () => {
    const categoryScores: Record<string, { total: number; count: number }> = {};

    questions.forEach((q) => {
      const score = answers[q.id] || 0;
      if (!categoryScores[q.category]) {
        categoryScores[q.category] = { total: 0, count: 0 };
      }
      categoryScores[q.category].total += score;
      categoryScores[q.category].count += 1;
    });

    return Object.entries(categoryScores).map(([category, data]) => ({
      label: category,
      value: (data.total / data.count) * 10,
    }));
  };

  const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
  const maxScore = questions.length * 10;
  const percentage = (totalScore / maxScore) * 100;

  const getVerdict = (pct: number) => {
    if (pct >= 80)
      return {
        text: "Investment Ready",
        color: "text-green-500",
        desc: "Your startup shows strong indicators across all areas. You're well-positioned to approach investors.",
      };
    if (pct >= 60)
      return {
        text: "Nearly Ready",
        color: "text-blue-500",
        desc: "You have solid fundamentals but some areas need strengthening before investor conversations.",
      };
    if (pct >= 40)
      return {
        text: "Building Momentum",
        color: "text-yellow-500",
        desc: "You're making progress but need to focus on key areas before seeking investment.",
      };
    return {
      text: "Early Stage",
      color: "text-orange-500",
      desc: "Focus on product development and early traction before approaching investors.",
    };
  };

  const verdict = getVerdict(percentage);
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const resetAssessment = () => {
    setShowResults(false);
    setCurrentQuestion(0);
    setAnswers({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-20 px-4">
      <div className="container max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Investor Readiness Assessment
          </h1>
          <p className="text-xl text-slate-400">
            Evaluate your startup across 5 critical dimensions
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!showResults ? (
            <motion.div
              key="questionnaire"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard3D className="p-8 mb-6">
                {/* Progress bar */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400">
                      Question {currentQuestion + 1} of {questions.length}
                    </span>
                    <span className="text-sm text-primary font-semibold">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Question */}
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <span className="inline-block px-3 py-1 bg-primary/20 text-primary rounded-full text-sm mb-4">
                      {questions[currentQuestion].category}
                    </span>
                    <h2 className="text-2xl font-bold text-white">
                      {questions[currentQuestion].question}
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {questions[currentQuestion].options.map((option, idx) => (
                      <motion.button
                        key={idx}
                        onClick={() => handleAnswer(option.score)}
                        className="w-full p-4 text-left rounded-xl bg-slate-800/50 border border-slate-700 hover:border-primary/50 hover:bg-slate-800 transition-all group"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white group-hover:text-primary transition-colors">
                            {option.text}
                          </span>
                          <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-primary transition-colors" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setCurrentQuestion(Math.max(0, currentQuestion - 1))
                    }
                    disabled={currentQuestion === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <div className="flex gap-2">
                    {questions.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-all ${
                          answers[questions[idx].id]
                            ? "bg-primary"
                            : idx === currentQuestion
                            ? "bg-primary/50"
                            : "bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </GlassCard3D>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              {/* Overall Score */}
              <GlassCard3D className="p-8 mb-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  <h2 className="text-3xl font-bold mb-6 text-white">
                    Your Investment Readiness Score
                  </h2>
                  <ScoreGauge score={percentage} label="Overall" size={250} />
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="mt-8"
                  >
                    <div className={`text-2xl font-bold ${verdict.color} mb-2`}>
                      {verdict.text}
                    </div>
                    <p className="text-slate-400 max-w-lg mx-auto">
                      {verdict.desc}
                    </p>
                  </motion.div>
                </motion.div>
              </GlassCard3D>

              {/* Category Breakdown */}
              <GlassCard3D className="p-8 mb-6">
                <h3 className="text-2xl font-bold mb-8 text-center text-white">
                  Category Breakdown
                </h3>
                <div className="flex justify-center">
                  <RadarChart data={calculateScores()} maxValue={100} size={400} />
                </div>
              </GlassCard3D>

              {/* Recommendations */}
              <GlassCard3D className="p-8">
                <h3 className="text-2xl font-bold mb-6 text-white">
                  Personalized Recommendations
                </h3>
                <div className="space-y-4">
                  {calculateScores().map((category, idx) => (
                    <motion.div
                      key={category.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.5 + idx * 0.1 }}
                      className="flex items-start gap-3 p-4 rounded-lg bg-slate-800/50"
                    >
                      {category.value >= 70 ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold text-white mb-1">
                          {category.label}
                        </div>
                        <div className="text-sm text-slate-400">
                          {category.value >= 70
                            ? `Strong ${category.label.toLowerCase()} fundamentals. Keep building on this momentum.`
                            : `Focus on strengthening your ${category.label.toLowerCase()}. Consider targeted improvements in this area.`}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex gap-4 mt-8">
                  <Button className="flex-1" size="lg">
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF Report
                  </Button>
                  <Button variant="outline" size="lg" onClick={resetAssessment}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retake Assessment
                  </Button>
                </div>
              </GlassCard3D>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
