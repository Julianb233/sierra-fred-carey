"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ReloadIcon, ArrowRightIcon } from "@radix-ui/react-icons";
import { Users, TrendingUp, DollarSign, Target, Layers, Download, RotateCcw, Eye } from "lucide-react";
import { ICVerdict, type Verdict } from "./ic-verdict";
import { VCAxesBreakdown, type VCAxis } from "./vc-axes-breakdown";
import { HiddenFilters, type HiddenFilter } from "./hidden-filters";
import { PassReasons, type PassReason } from "./pass-reasons";
import { DeriskingActions, type DeriskingAction } from "./derisking-actions";
import { DeckProtocol, type DeckRecommendation } from "./deck-protocol";

type Stage = "pre-seed" | "seed" | "series-a";

interface InvestorProfile {
  companyName: string;
  stage: Stage;
  teamBackground: string;
  problemDescription: string;
  solution: string;
  marketSize: string;
  traction: string;
  revenue: string;
  growthRate: string;
  businessModel: string;
  competitiveAdvantage: string;
  fundingAsk: string;
  useOfFunds: string;
  previousFunding: string;
}

interface EvaluationResults {
  verdict: Verdict;
  confidence: number;
  reasoning: string;
  axes: VCAxis[];
  hiddenFilters: HiddenFilter[];
  passReasons: PassReason[];
  deriskingActions: DeriskingAction[];
  deckRecommendation: DeckRecommendation;
  deckReasoning: string;
  deckGuidance: string[];
  deckReadinessScore: number;
}

export function InvestorLensEvaluation() {
  const [step, setStep] = useState<"form" | "results">("form");
  const [evaluating, setEvaluating] = useState(false);
  const [profile, setProfile] = useState<InvestorProfile>({
    companyName: "",
    stage: "seed",
    teamBackground: "",
    problemDescription: "",
    solution: "",
    marketSize: "",
    traction: "",
    revenue: "",
    growthRate: "",
    businessModel: "",
    competitiveAdvantage: "",
    fundingAsk: "",
    useOfFunds: "",
    previousFunding: "",
  });
  const [results, setResults] = useState<EvaluationResults | null>(null);

  const updateField = (field: keyof InvestorProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value as any }));
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const response = await fetch("/api/investor-lens/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        setStep("results");
        toast.success("Investor lens evaluation complete!");
      } else {
        toast.error(data.error || "Failed to evaluate");
      }
    } catch (error) {
      console.error("Error evaluating:", error);
      toast.error("Failed to complete evaluation. Please try again.");
    } finally {
      setEvaluating(false);
    }
  };

  const resetEvaluation = () => {
    setStep("form");
    setResults(null);
  };

  const stageDescriptions: Record<Stage, string> = {
    "pre-seed": "Idea stage, building MVP, little to no revenue",
    seed: "$0-$500K ARR, product-market fit exploration",
    "series-a": "$500K-$2M+ ARR, proven PMF, scaling operations",
  };

  if (step === "form") {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Investor Lens</h1>
            <Badge className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white border-0">
              Pro
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Get a realistic VC evaluation of your startup. See how investors actually
            assess opportunities, including the unspoken filters they apply.
          </p>
        </div>

        {/* Stage Selector */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Fundraising Stage</Label>
              <p className="text-sm text-muted-foreground">
                Select the stage you're raising for. Evaluation criteria vary significantly by stage.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {(["pre-seed", "seed", "series-a"] as Stage[]).map((stage) => (
                <button
                  key={stage}
                  onClick={() => updateField("stage", stage)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    profile.stage === stage
                      ? "border-[#ff6a1a] bg-[#ff6a1a]/5"
                      : "border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/50"
                  }`}
                >
                  <div className="font-semibold capitalize mb-1">
                    {stage.replace("-", " ")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stageDescriptions[stage]}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Form */}
        <Card className="p-6">
          <Tabs defaultValue="team" className="w-full">
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 sm:grid sm:w-full sm:grid-cols-5 lg:w-auto lg:inline-grid">
                <TabsTrigger value="team" className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Team</span>
                </TabsTrigger>
                <TabsTrigger value="market" className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Market</span>
                </TabsTrigger>
                <TabsTrigger value="traction" className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <Target className="h-4 w-4" />
                  <span className="hidden sm:inline">Traction</span>
                </TabsTrigger>
                <TabsTrigger value="business" className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <Layers className="h-4 w-4" />
                  <span className="hidden sm:inline">Business</span>
                </TabsTrigger>
                <TabsTrigger value="funding" className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Funding</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Team Tab */}
            <TabsContent value="team" className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Your startup name"
                  value={profile.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamBackground">Founding Team Background</Label>
                <Textarea
                  id="teamBackground"
                  placeholder="Describe your founding team's background, expertise, and relevant experience. Include previous exits, domain expertise, and why this team is uniquely positioned to win."
                  value={profile.teamBackground}
                  onChange={(e) => updateField("teamBackground", e.target.value)}
                  rows={5}
                />
              </div>
            </TabsContent>

            {/* Market Tab */}
            <TabsContent value="market" className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="problemDescription">Problem Statement</Label>
                <Textarea
                  id="problemDescription"
                  placeholder="What specific problem are you solving? How painful is it? Who experiences it most acutely?"
                  value={profile.problemDescription}
                  onChange={(e) => updateField("problemDescription", e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="solution">Your Solution</Label>
                <Textarea
                  id="solution"
                  placeholder="How does your product solve this problem? What's your unique approach?"
                  value={profile.solution}
                  onChange={(e) => updateField("solution", e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marketSize">Market Size (TAM/SAM/SOM)</Label>
                <Textarea
                  id="marketSize"
                  placeholder="Define your total addressable market, serviceable market, and initial target segment with data sources."
                  value={profile.marketSize}
                  onChange={(e) => updateField("marketSize", e.target.value)}
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Traction Tab */}
            <TabsContent value="traction" className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="traction">Current Traction</Label>
                <Textarea
                  id="traction"
                  placeholder="Users, customers, pilots, waitlist, LOIs, partnerships, or other proof points. Be specific with numbers."
                  value={profile.traction}
                  onChange={(e) => updateField("traction", e.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="revenue">Revenue (ARR/MRR)</Label>
                  <Input
                    id="revenue"
                    placeholder="e.g., $50K ARR, Pre-revenue"
                    value={profile.revenue}
                    onChange={(e) => updateField("revenue", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="growthRate">Growth Rate</Label>
                  <Input
                    id="growthRate"
                    placeholder="e.g., 20% MoM, 3x YoY"
                    value={profile.growthRate}
                    onChange={(e) => updateField("growthRate", e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Business Tab */}
            <TabsContent value="business" className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="businessModel">Business Model</Label>
                <Textarea
                  id="businessModel"
                  placeholder="How do you make money? Pricing model, unit economics (CAC, LTV), gross margins."
                  value={profile.businessModel}
                  onChange={(e) => updateField("businessModel", e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="competitiveAdvantage">Competitive Advantage & Moat</Label>
                <Textarea
                  id="competitiveAdvantage"
                  placeholder="What's your defensible moat? Why can't competitors copy you? Network effects, proprietary data, patents, etc."
                  value={profile.competitiveAdvantage}
                  onChange={(e) => updateField("competitiveAdvantage", e.target.value)}
                  rows={4}
                />
              </div>
            </TabsContent>

            {/* Funding Tab */}
            <TabsContent value="funding" className="space-y-6 mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fundingAsk">Funding Ask</Label>
                  <Input
                    id="fundingAsk"
                    placeholder="e.g., $2M Seed"
                    value={profile.fundingAsk}
                    onChange={(e) => updateField("fundingAsk", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="previousFunding">Previous Funding</Label>
                  <Input
                    id="previousFunding"
                    placeholder="e.g., $500K Pre-seed from angels"
                    value={profile.previousFunding}
                    onChange={(e) => updateField("previousFunding", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="useOfFunds">Use of Funds</Label>
                <Textarea
                  id="useOfFunds"
                  placeholder="How will you deploy this capital? What milestones will you hit before the next raise?"
                  value={profile.useOfFunds}
                  onChange={(e) => updateField("useOfFunds", e.target.value)}
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleEvaluate}
              disabled={evaluating || !profile.companyName}
              className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white"
              size="lg"
            >
              {evaluating ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Running VC Evaluation...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Get Investor Lens View
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
            <h1 className="text-3xl font-bold">Investor Lens Results</h1>
            <Badge className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white border-0">
              Pro
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {profile.companyName} - {profile.stage.replace("-", " ").toUpperCase()} Evaluation
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={resetEvaluation} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Re-evaluate
          </Button>
          <Button className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* IC Verdict */}
      {results && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <ICVerdict
            verdict={results.verdict}
            reasoning={results.reasoning}
            stage={profile.stage.replace("-", " ").toUpperCase()}
            confidence={results.confidence}
          />
        </motion.div>
      )}

      {/* VC Axes Breakdown */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <VCAxesBreakdown axes={results.axes} />
        </motion.div>
      )}

      {/* Two Column Layout for Hidden Filters and Pass Reasons */}
      {results && (
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <HiddenFilters filters={results.hiddenFilters} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <PassReasons reasons={results.passReasons} />
          </motion.div>
        </div>
      )}

      {/* De-risking Actions */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <DeriskingActions actions={results.deriskingActions} />
        </motion.div>
      )}

      {/* Deck Protocol */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <DeckProtocol
            recommendation={results.deckRecommendation}
            reasoning={results.deckReasoning}
            specificGuidance={results.deckGuidance}
            readinessScore={results.deckReadinessScore}
          />
        </motion.div>
      )}

      {/* CTA */}
      <Card className="p-6 bg-gradient-to-r from-[#ff6a1a]/10 to-transparent border-[#ff6a1a]/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-1">Want deeper investor insights?</h3>
            <p className="text-sm text-muted-foreground">
              Get a 1-on-1 review of your investor readiness with an expert.
            </p>
          </div>
          <Button className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white">
            Book Expert Review
          </Button>
        </div>
      </Card>
    </div>
  );
}

