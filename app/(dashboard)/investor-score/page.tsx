"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  CheckCircle2, 
  Circle, 
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Target
} from "lucide-react";

export default function InvestorScorePage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const questions = [
    {
      id: 0,
      category: "Team",
      question: "Does your team have relevant industry experience?",
      options: [
        { value: 0, label: "No relevant experience" },
        { value: 5, label: "Some relevant experience" },
        { value: 10, label: "Strong relevant experience" }
      ]
    },
    {
      id: 1,
      category: "Team",
      question: "Have any team members previously built and sold a company?",
      options: [
        { value: 0, label: "No" },
        { value: 5, label: "Related experience" },
        { value: 10, label: "Yes, successful exit" }
      ]
    },
    {
      id: 2,
      category: "Product",
      question: "What stage is your product at?",
      options: [
        { value: 0, label: "Idea stage" },
        { value: 5, label: "Working prototype" },
        { value: 10, label: "Live product with users" }
      ]
    },
    {
      id: 3,
      category: "Product",
      question: "How validated is your product-market fit?",
      options: [
        { value: 0, label: "No validation" },
        { value: 5, label: "Some customer feedback" },
        { value: 10, label: "Strong validated demand" }
      ]
    },
    {
      id: 4,
      category: "Traction",
      question: "Do you have paying customers?",
      options: [
        { value: 0, label: "No customers" },
        { value: 5, label: "Some pilot customers" },
        { value: 10, label: "Growing customer base" }
      ]
    },
    {
      id: 5,
      category: "Traction",
      question: "What's your monthly revenue run rate?",
      options: [
        { value: 0, label: "Pre-revenue" },
        { value: 5, label: "$1K - $10K MRR" },
        { value: 10, label: "$10K+ MRR" }
      ]
    },
    {
      id: 6,
      category: "Market",
      question: "How large is your addressable market?",
      options: [
        { value: 0, label: "Small/niche (<$100M)" },
        { value: 5, label: "Medium ($100M-$1B)" },
        { value: 10, label: "Large ($1B+)" }
      ]
    },
    {
      id: 7,
      category: "Market",
      question: "How competitive is your market?",
      options: [
        { value: 0, label: "Highly saturated" },
        { value: 5, label: "Moderately competitive" },
        { value: 10, label: "Blue ocean / clear differentiation" }
      ]
    },
    {
      id: 8,
      category: "Business Model",
      question: "How clear is your path to profitability?",
      options: [
        { value: 0, label: "Uncertain" },
        { value: 5, label: "Defined but unproven" },
        { value: 10, label: "Clear and validated" }
      ]
    },
    {
      id: 9,
      category: "Business Model",
      question: "What are your unit economics?",
      options: [
        { value: 0, label: "Negative or unknown" },
        { value: 5, label: "Break-even" },
        { value: 10, label: "Strong positive margins" }
      ]
    }
  ];

  const handleAnswer = (value: number) => {
    setAnswers({ ...answers, [currentQuestion]: value });
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateScore = () => {
    const total = Object.values(answers).reduce((sum, val) => sum + val, 0);
    return Math.round((total / (questions.length * 10)) * 100);
  };

  const getScoreCategory = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: "text-green-500", bg: "bg-green-500" };
    if (score >= 60) return { label: "Good", color: "text-blue-500", bg: "bg-blue-500" };
    if (score >= 40) return { label: "Developing", color: "text-yellow-500", bg: "bg-yellow-500" };
    return { label: "Early Stage", color: "text-red-500", bg: "bg-red-500" };
  };

  const getRecommendations = (score: number) => {
    const recs = [];
    
    if (score < 60) {
      recs.push({
        title: "Focus on Product-Market Fit",
        description: "Before seeking investment, validate that customers truly need your solution",
        priority: "high"
      });
    }
    
    if (!answers[4] || answers[4] < 10) {
      recs.push({
        title: "Get Your First Customers",
        description: "Paying customers are the strongest signal to investors",
        priority: "high"
      });
    }
    
    if (!answers[0] || answers[0] < 10) {
      recs.push({
        title: "Strengthen Your Team",
        description: "Consider adding advisors or team members with relevant experience",
        priority: "medium"
      });
    }
    
    if (!answers[8] || answers[8] < 5) {
      recs.push({
        title: "Clarify Your Business Model",
        description: "Develop a clear, data-backed path to profitability",
        priority: "high"
      });
    }

    recs.push({
      title: "Prepare Your Pitch Materials",
      description: "Create a compelling pitch deck and financial projections",
      priority: "medium"
    });

    return recs;
  };

  if (showResults) {
    const score = calculateScore();
    const category = getScoreCategory(score);
    const recommendations = getRecommendations(score);

    return (
      <div className="max-w-4xl space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold tracking-tight">Your Investor Readiness Score</h1>
          </div>
          <p className="text-muted-foreground">
            Based on your responses, here's how ready you are for investment
          </p>
        </div>

        {/* Score Card */}
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Overall Readiness</CardTitle>
                <CardDescription>Across 5 key categories</CardDescription>
              </div>
              <div className="text-center">
                <div className={`text-5xl font-bold ${category.color}`}>{score}</div>
                <Badge className={`${category.bg} mt-2`}>{category.label}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={score} className="h-3" />
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>How you scored in each area</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {["Team", "Product", "Traction", "Market", "Business Model"].map((cat) => {
              const catQuestions = questions.filter(q => q.category === cat);
              const catScore = catQuestions.reduce((sum, q) => sum + (answers[q.id] || 0), 0);
              const catMax = catQuestions.length * 10;
              const catPercent = Math.round((catScore / catMax) * 100);
              
              return (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{cat}</Label>
                    <span className="text-sm font-semibold">{catPercent}%</span>
                  </div>
                  <Progress value={catPercent} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Recommended Actions
            </CardTitle>
            <CardDescription>
              Focus on these areas to improve your investor readiness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 border rounded-lg">
                <div className={`mt-1 ${rec.priority === 'high' ? 'text-red-500' : 'text-yellow-500'}`}>
                  {rec.priority === 'high' ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <Target className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{rec.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {rec.priority === 'high' ? 'High Priority' : 'Medium Priority'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              {score >= 70 
                ? "You're in a strong position! Consider reaching out to investors and refining your pitch materials."
                : "Focus on the high-priority recommendations above before actively seeking investment."}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => { setShowResults(false); setCurrentQuestion(0); setAnswers({}); }}>
                Retake Assessment
              </Button>
              <Button variant="outline" asChild>
                <a href="/documents">Generate Pitch Materials</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold tracking-tight">Investor Readiness Assessment</h1>
        </div>
        <p className="text-muted-foreground">
          Answer 10 questions to get your investor readiness score
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Question {currentQuestion + 1} of {questions.length}</span>
          <span className="font-semibold">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <Badge className="w-fit mb-2">{questions[currentQuestion].category}</Badge>
          <CardTitle className="text-xl">
            {questions[currentQuestion].question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions[currentQuestion].options.map((option) => (
            <Button
              key={option.value}
              variant={answers[currentQuestion] === option.value ? "default" : "outline"}
              className="w-full justify-start h-auto py-4 text-left"
              onClick={() => handleAnswer(option.value)}
            >
              <div className="flex items-center gap-3">
                {answers[currentQuestion] === option.value ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 flex-shrink-0" />
                )}
                <span>{option.label}</span>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
        >
          Previous
        </Button>
        <Button
          variant="ghost"
          onClick={() => setShowResults(true)}
          disabled={Object.keys(answers).length === 0}
        >
          Skip to Results
        </Button>
      </div>
    </div>
  );
}
