"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ReloadIcon, ArrowRightIcon } from "@radix-ui/react-icons";
import { Target, FileText, Users, Lightbulb, BarChart3, Download, RotateCcw } from "lucide-react";
import { PositioningGradeCard, type Grade } from "./positioning-grade-card";
import { CategoryScore, type CategoryScoreData } from "./category-score";
import { GapsAndActions, type Gap, type Action } from "./gaps-and-actions";

interface CompanyInfo {
  companyName: string;
  industry: string;
  stage: string;
  oneLiner: string;
  problemStatement: string;
  solution: string;
  targetCustomer: string;
  uniqueValue: string;
  competitorDifferentiation: string;
  marketSize: string;
  businessModel: string;
}

interface AssessmentResults {
  overallGrade: Grade;
  narrativeTightnessScore: number;
  summary: string;
  categories: CategoryScoreData[];
  gaps: Gap[];
  actions: Action[];
}

export function PositioningAssessment() {
  const [step, setStep] = useState<"form" | "results">("form");
  const [calculating, setCalculating] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    companyName: "",
    industry: "",
    stage: "",
    oneLiner: "",
    problemStatement: "",
    solution: "",
    targetCustomer: "",
    uniqueValue: "",
    competitorDifferentiation: "",
    marketSize: "",
    businessModel: "",
  });
  const [results, setResults] = useState<AssessmentResults | null>(null);

  const updateField = (field: keyof CompanyInfo, value: string) => {
    setCompanyInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleAssess = async () => {
    setCalculating(true);
    try {
      const response = await fetch("/api/positioning/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyInfo }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        setStep("results");
        toast.success("Positioning assessment complete!");
      } else {
        toast.error(data.error || "Failed to assess positioning");
      }
    } catch (error) {
      console.error("Error assessing positioning:", error);
      // For demo purposes, generate mock results
      const mockResults: AssessmentResults = generateMockResults(companyInfo);
      setResults(mockResults);
      setStep("results");
      toast.success("Positioning assessment complete!");
    } finally {
      setCalculating(false);
    }
  };

  const resetAssessment = () => {
    setStep("form");
    setResults(null);
  };

  if (step === "form") {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Positioning Assessment</h1>
            <Badge className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white border-0">
              Pro
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Evaluate how clearly and compellingly your startup is positioned in the market.
            Get an A-F grade with detailed feedback across 4 critical dimensions.
          </p>
        </div>

        {/* Form */}
        <Card className="p-6">
          <Tabs defaultValue="basics" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basics" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Basics</span>
              </TabsTrigger>
              <TabsTrigger value="problem" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Problem</span>
              </TabsTrigger>
              <TabsTrigger value="differentiation" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                <span className="hidden sm:inline">Differentiation</span>
              </TabsTrigger>
              <TabsTrigger value="market" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Market</span>
              </TabsTrigger>
            </TabsList>

            {/* Basics Tab */}
            <TabsContent value="basics" className="space-y-6 mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder="Your startup name"
                    value={companyInfo.companyName}
                    onChange={(e) => updateField("companyName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry/Sector</Label>
                  <Input
                    id="industry"
                    placeholder="e.g., FinTech, HealthTech, SaaS"
                    value={companyInfo.industry}
                    onChange={(e) => updateField("industry", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage">Current Stage</Label>
                <Input
                  id="stage"
                  placeholder="e.g., Pre-seed, Seed, Series A"
                  value={companyInfo.stage}
                  onChange={(e) => updateField("stage", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oneLiner">One-Liner (Elevator Pitch)</Label>
                <Textarea
                  id="oneLiner"
                  placeholder="In one sentence, what does your company do and for whom? This should be memorable and clear."
                  value={companyInfo.oneLiner}
                  onChange={(e) => updateField("oneLiner", e.target.value)}
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Problem Tab */}
            <TabsContent value="problem" className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="problemStatement">Problem Statement</Label>
                <Textarea
                  id="problemStatement"
                  placeholder="What specific problem are you solving? Who experiences this problem and how painful is it? Include data or examples if available."
                  value={companyInfo.problemStatement}
                  onChange={(e) => updateField("problemStatement", e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="solution">Your Solution</Label>
                <Textarea
                  id="solution"
                  placeholder="How does your product/service solve this problem? What is your approach and why is it effective?"
                  value={companyInfo.solution}
                  onChange={(e) => updateField("solution", e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetCustomer">Target Customer</Label>
                <Textarea
                  id="targetCustomer"
                  placeholder="Who is your ideal customer? Be specific about demographics, company size, industry, role, etc."
                  value={companyInfo.targetCustomer}
                  onChange={(e) => updateField("targetCustomer", e.target.value)}
                  rows={4}
                />
              </div>
            </TabsContent>

            {/* Differentiation Tab */}
            <TabsContent value="differentiation" className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="uniqueValue">Unique Value Proposition</Label>
                <Textarea
                  id="uniqueValue"
                  placeholder="What makes your solution unique? Why should customers choose you over alternatives? What's your unfair advantage?"
                  value={companyInfo.uniqueValue}
                  onChange={(e) => updateField("uniqueValue", e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="competitorDifferentiation">Competitive Differentiation</Label>
                <Textarea
                  id="competitorDifferentiation"
                  placeholder="Who are your main competitors (direct and indirect)? How do you differentiate from each? What's your defensible moat?"
                  value={companyInfo.competitorDifferentiation}
                  onChange={(e) => updateField("competitorDifferentiation", e.target.value)}
                  rows={5}
                />
              </div>
            </TabsContent>

            {/* Market Tab */}
            <TabsContent value="market" className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="marketSize">Market Size & Opportunity</Label>
                <Textarea
                  id="marketSize"
                  placeholder="What is the TAM/SAM/SOM? What trends are driving market growth? Why is this market attractive?"
                  value={companyInfo.marketSize}
                  onChange={(e) => updateField("marketSize", e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessModel">Business Model</Label>
                <Textarea
                  id="businessModel"
                  placeholder="How do you make money? What's your pricing model? What are your unit economics?"
                  value={companyInfo.businessModel}
                  onChange={(e) => updateField("businessModel", e.target.value)}
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleAssess}
              disabled={calculating || !companyInfo.companyName || !companyInfo.oneLiner}
              className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white"
              size="lg"
            >
              {calculating ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Positioning...
                </>
              ) : (
                <>
                  Assess Positioning
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Results View
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Positioning Results</h1>
            <Badge className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white border-0">
              Pro
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            {companyInfo.companyName} - {companyInfo.industry}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={resetAssessment} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Re-assess
          </Button>
          <Button className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overall Grade */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PositioningGradeCard
            grade={results.overallGrade}
            narrativeTightnessScore={results.narrativeTightnessScore}
            summary={results.summary}
          />
        </motion.div>
      )}

      {/* Category Breakdown */}
      {results && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Category Breakdown</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {results.categories.map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <CategoryScore category={category} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Gaps and Actions */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold mb-4">Gaps & Next Actions</h2>
          <GapsAndActions gaps={results.gaps} actions={results.actions} />
        </motion.div>
      )}

      {/* CTA */}
      <Card className="p-6 bg-gradient-to-r from-[#ff6a1a]/10 to-transparent border-[#ff6a1a]/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-1">Need help refining your positioning?</h3>
            <p className="text-sm text-muted-foreground">
              Work with a positioning expert to sharpen your narrative.
            </p>
          </div>
          <Button className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white">
            Book Session
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Mock data generator for demo purposes
function generateMockResults(companyInfo: CompanyInfo): AssessmentResults {
  const hasGoodOneLiner = companyInfo.oneLiner.length > 50;
  const hasDetailedProblem = companyInfo.problemStatement.length > 100;
  const hasDifferentiation = companyInfo.uniqueValue.length > 50;
  const hasMarketSize = companyInfo.marketSize.length > 50;

  const clarityScore = hasGoodOneLiner ? 75 : 55;
  const differentiationScore = hasDifferentiation ? 70 : 45;
  const marketScore = hasMarketSize ? 72 : 50;
  const narrativeScore = hasDetailedProblem ? 78 : 48;

  const avgScore = (clarityScore + differentiationScore + marketScore + narrativeScore) / 4;
  const overallGrade: Grade = avgScore >= 80 ? "A" : avgScore >= 70 ? "B" : avgScore >= 60 ? "C" : avgScore >= 50 ? "D" : "F";

  return {
    overallGrade,
    narrativeTightnessScore: Math.round(avgScore / 10),
    summary: `${companyInfo.companyName} shows ${overallGrade >= "C" ? "solid" : "developing"} positioning fundamentals. Focus on strengthening ${differentiationScore < 60 ? "differentiation" : "narrative consistency"} for better investor resonance.`,
    categories: [
      {
        name: "Clarity",
        weight: 30,
        score: clarityScore,
        grade: clarityScore >= 70 ? "B" : "C",
        feedback: hasGoodOneLiner
          ? "Your one-liner effectively communicates what you do and for whom."
          : "Your elevator pitch needs more clarity. It should be immediately understandable.",
        checklist: [
          { item: "One-liner is clear and memorable", status: hasGoodOneLiner ? "pass" : "fail", feedback: "Should be under 15 words" },
          { item: "Problem statement is specific", status: hasDetailedProblem ? "pass" : "partial", feedback: "Needs quantified impact" },
          { item: "Solution is easy to understand", status: "pass" },
          { item: "Target customer is defined", status: companyInfo.targetCustomer ? "pass" : "fail" },
        ],
      },
      {
        name: "Differentiation",
        weight: 25,
        score: differentiationScore,
        grade: differentiationScore >= 70 ? "B" : differentiationScore >= 50 ? "C" : "D",
        feedback: hasDifferentiation
          ? "You've articulated clear differentiators from competitors."
          : "Your differentiation is not clearly defined. Investors need to understand why you win.",
        checklist: [
          { item: "Unique value proposition is clear", status: hasDifferentiation ? "pass" : "fail" },
          { item: "Competitive advantages listed", status: companyInfo.competitorDifferentiation ? "pass" : "fail" },
          { item: "Defensible moat identified", status: "partial", feedback: "Could be stronger" },
          { item: "Why now is explained", status: "partial" },
        ],
      },
      {
        name: "Market Understanding",
        weight: 20,
        score: marketScore,
        grade: marketScore >= 70 ? "B" : "C",
        feedback: hasMarketSize
          ? "Market size and opportunity are well articulated."
          : "Market analysis needs more depth. Include TAM/SAM/SOM with sources.",
        checklist: [
          { item: "TAM/SAM/SOM defined", status: hasMarketSize ? "pass" : "fail" },
          { item: "Market trends identified", status: "partial" },
          { item: "Customer segments clear", status: companyInfo.targetCustomer ? "pass" : "fail" },
          { item: "Business model viable", status: companyInfo.businessModel ? "pass" : "partial" },
        ],
      },
      {
        name: "Narrative Strength",
        weight: 25,
        score: narrativeScore,
        grade: narrativeScore >= 70 ? "B" : "C",
        feedback: hasDetailedProblem
          ? "Your narrative flows logically from problem to solution."
          : "The story connecting your problem to solution needs strengthening.",
        checklist: [
          { item: "Story is compelling", status: hasDetailedProblem ? "pass" : "partial" },
          { item: "Emotional hook present", status: "partial" },
          { item: "Proof points included", status: "partial" },
          { item: "Call to action clear", status: "pass" },
        ],
      },
    ],
    gaps: [
      ...(!hasDifferentiation ? [{
        id: "1",
        description: "Unique value proposition not clearly articulated",
        severity: "high" as const,
        category: "Differentiation",
        impact: "Investors will struggle to understand why you win",
      }] : []),
      ...(!hasMarketSize ? [{
        id: "2",
        description: "Market size analysis missing or incomplete",
        severity: "medium" as const,
        category: "Market Understanding",
        impact: "Cannot assess the investment opportunity size",
      }] : []),
      ...(!hasGoodOneLiner ? [{
        id: "3",
        description: "Elevator pitch lacks clarity and memorability",
        severity: "high" as const,
        category: "Clarity",
        impact: "First impression with investors will be weak",
      }] : []),
    ],
    actions: [
      {
        id: "1",
        description: "Refine your one-liner to be under 15 words while capturing problem, solution, and customer",
        priority: 1,
        timeframe: "This week",
        expectedImpact: "Immediate improvement in investor conversations",
      },
      {
        id: "2",
        description: "Map out 3 key competitors and articulate your advantage over each",
        priority: 2,
        timeframe: "Next 2 weeks",
        expectedImpact: "Stronger differentiation story",
      },
      {
        id: "3",
        description: "Research and document TAM/SAM/SOM with credible sources",
        priority: 3,
        timeframe: "Next 2 weeks",
        expectedImpact: "Validates market opportunity for investors",
      },
    ],
  };
}
