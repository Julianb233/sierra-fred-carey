"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Telescope, 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Zap, 
  Timer,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

export default function RealityLensPage() {
  const [idea, setIdea] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    // Simulate API call
    setTimeout(() => {
      setAnalysis({
        feasibility: {
          score: 78,
          status: "good",
          insights: [
            "Technology stack is proven and accessible",
            "Team has relevant experience",
            "Market timing is favorable"
          ],
          concerns: [
            "Competitive landscape is crowded",
            "Regulatory considerations need attention"
          ]
        },
        economics: {
          score: 65,
          status: "moderate",
          insights: [
            "Clear revenue model identified",
            "Unit economics show promise"
          ],
          concerns: [
            "High customer acquisition costs",
            "Long payback period"
          ]
        },
        demand: {
          score: 82,
          status: "good",
          insights: [
            "Strong market need validated",
            "Early customer interest confirmed",
            "Growing market trends"
          ],
          concerns: [
            "Market education required"
          ]
        },
        distribution: {
          score: 58,
          status: "needs-work",
          insights: [
            "Digital channels accessible"
          ],
          concerns: [
            "Limited network effects initially",
            "Channel partner relationships needed",
            "Marketing strategy underdeveloped"
          ]
        },
        timing: {
          score: 75,
          status: "good",
          insights: [
            "Market conditions favorable",
            "Technology maturity appropriate",
            "Regulatory environment stable"
          ],
          concerns: [
            "Competitive window narrowing"
          ]
        }
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  const categories = [
    {
      key: "feasibility",
      title: "Feasibility",
      description: "Can you actually build this?",
      icon: Sparkles
    },
    {
      key: "economics",
      title: "Economics",
      description: "Can you make money?",
      icon: DollarSign
    },
    {
      key: "demand",
      title: "Demand",
      description: "Do people want this?",
      icon: Users
    },
    {
      key: "distribution",
      title: "Distribution",
      description: "Can you reach customers?",
      icon: Zap
    },
    {
      key: "timing",
      title: "Timing",
      description: "Is now the right time?",
      icon: Timer
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-500";
      case "moderate":
        return "text-yellow-500";
      case "needs-work":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "good":
        return <Badge className="bg-green-500">Strong</Badge>;
      case "moderate":
        return <Badge className="bg-yellow-500">Moderate</Badge>;
      case "needs-work":
        return <Badge className="bg-red-500">Needs Work</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Telescope className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold tracking-tight">Reality Lens</h1>
        </div>
        <p className="text-muted-foreground">
          Get honest, data-driven feedback on your startup idea across five critical dimensions
        </p>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Describe Your Startup Idea</CardTitle>
          <CardDescription>
            Tell us about your product, target market, and business model. The more detail, the better the analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="idea">Your Startup Idea</Label>
            <Textarea
              id="idea"
              placeholder="Example: We're building a B2B SaaS platform that helps remote teams manage asynchronous communication. Our target customers are tech companies with 50-500 employees. We charge $10 per user per month..."
              className="min-h-[200px]"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleAnalyze} 
            disabled={!idea.trim() || isAnalyzing}
            className="w-full sm:w-auto"
          >
            {isAnalyzing ? (
              <>Analyzing...</>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze My Idea
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <>
          {/* Overall Score */}
          <Card className="border-2 border-blue-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Overall Assessment</CardTitle>
                  <CardDescription>
                    Based on five critical startup dimensions
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-blue-500">
                    {Math.round(
                      (analysis.feasibility.score +
                        analysis.economics.score +
                        analysis.demand.score +
                        analysis.distribution.score +
                        analysis.timing.score) / 5
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">out of 100</div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Detailed Analysis */}
          <div className="space-y-6">
            {categories.map((category) => {
              const data = analysis[category.key];
              return (
                <Card key={category.key}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <category.icon className={`h-6 w-6 mt-1 ${getStatusColor(data.status)}`} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle>{category.title}</CardTitle>
                            {getStatusBadge(data.status)}
                          </div>
                          <CardDescription>{category.description}</CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${getStatusColor(data.status)}`}>
                          {data.score}
                        </div>
                        <div className="text-xs text-muted-foreground">/ 100</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress value={data.score} className="h-2" />
                    
                    {data.insights.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Strengths
                        </h4>
                        <ul className="space-y-1">
                          {data.insights.map((insight: string, idx: number) => (
                            <li key={idx} className="text-sm text-muted-foreground pl-6">
                              • {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {data.concerns.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                          Areas to Address
                        </h4>
                        <ul className="space-y-1">
                          {data.concerns.map((concern: string, idx: number) => (
                            <li key={idx} className="text-sm text-muted-foreground pl-6">
                              • {concern}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Next Steps */}
          <Card className="bg-muted">
            <CardHeader>
              <CardTitle>Recommended Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">
                  1
                </div>
                <p className="text-sm">
                  Focus on strengthening your distribution strategy - this is your weakest area
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">
                  2
                </div>
                <p className="text-sm">
                  Validate customer demand through conversations and early prototypes
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">
                  3
                </div>
                <p className="text-sm">
                  Develop a detailed go-to-market plan to improve unit economics
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
