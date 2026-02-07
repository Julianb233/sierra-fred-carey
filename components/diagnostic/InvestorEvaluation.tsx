"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Target,
  Users,
  DollarSign,
  Rocket,
  BarChart,
  Building,
  Briefcase,
  Scale,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type InvestorStage = "pre-seed" | "seed" | "series-a";
type InvestorVerdict = "yes" | "no" | "not-yet";

interface AxisScore {
  axis: string;
  score: number;
  notes: string;
}

interface EvidenceToFlip {
  passReason: string;
  evidenceNeeded: string;
}

interface InvestorResult {
  verdict: InvestorVerdict;
  verdictReason: string;
  stage: InvestorStage;
  axisScores: AxisScore[];
  passReasons: string[];
  evidenceToFlip: EvidenceToFlip[];
  hiddenFiltersTriggered: string[];
  deRiskingActions: string[];
  deckRecommendation: {
    needed: boolean;
    type: "summary" | "deck";
    reason: string;
  };
  milestoneMap: {
    timeframe: string;
    milestones: string[];
  };
  summary: string;
}

const AXIS_ICONS: Record<string, React.ElementType> = {
  Team: Users,
  Market: TrendingUp,
  Problem: Target,
  "Solution & Differentiation": Rocket,
  "Go-To-Market": BarChart,
  "Traction Quality": TrendingUp,
  "Business Model": DollarSign,
  "Fund Fit": Briefcase,
  "Valuation Realism": Scale,
};

const VERDICT_CONFIG: Record<
  InvestorVerdict,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  yes: {
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-100 dark:bg-green-900/30",
    label: "Yes - Would Take Meeting",
  },
  no: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-100 dark:bg-red-900/30",
    label: "No - Pass",
  },
  "not-yet": {
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    label: "Not Yet - Come Back Later",
  },
};

interface InvestorEvaluationProps {
  onComplete?: (result: InvestorResult) => void;
}

export function InvestorEvaluation({ onComplete }: InvestorEvaluationProps) {
  const [businessDescription, setBusinessDescription] = useState("");
  const [stage, setStage] = useState<InvestorStage>("pre-seed");
  const [traction, setTraction] = useState("");
  const [askAmount, setAskAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InvestorResult | null>(null);

  const handleSubmit = async () => {
    if (!businessDescription.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/diagnostic/investor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessDescription,
          stage,
          traction: traction || undefined,
          askAmount: askAmount || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to run evaluation");
      }

      const data = await response.json();

      if (data.parseError) {
        setError("Could not parse evaluation. Please try again.");
        return;
      }

      setResult(data.evaluation);
      onComplete?.(data.evaluation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setBusinessDescription("");
    setTraction("");
    setAskAmount("");
    setError(null);
  };

  if (result) {
    const verdictConfig = VERDICT_CONFIG[result.verdict];
    const VerdictIcon = verdictConfig.icon;

    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Verdict Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Investor Readiness Evaluation</CardTitle>
            <Badge variant="outline" className="w-fit mx-auto mt-2">
              {stage.replace("-", " ").toUpperCase()} Stage
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div
                className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center",
                  verdictConfig.bg
                )}
              >
                <VerdictIcon className={cn("w-12 h-12", verdictConfig.color)} />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{verdictConfig.label}</p>
                <p className="text-muted-foreground mt-2 max-w-lg">
                  {result.verdictReason}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="scores" className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 sm:grid sm:w-full sm:grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="scores" className="text-xs sm:text-sm whitespace-nowrap">Axis Scores</TabsTrigger>
              <TabsTrigger value="pass-reasons" className="text-xs sm:text-sm whitespace-nowrap">Pass Reasons</TabsTrigger>
              <TabsTrigger value="de-risk" className="text-xs sm:text-sm whitespace-nowrap">De-Risk Actions</TabsTrigger>
              <TabsTrigger value="milestones" className="text-xs sm:text-sm whitespace-nowrap">Milestones</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="scores" className="mt-4">
            <div className="grid gap-3">
              {result.axisScores.map((axis) => {
                const Icon = AXIS_ICONS[axis.axis] || Building;
                return (
                  <Card key={axis.axis}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{axis.axis}</span>
                            <span
                              className={cn(
                                "text-sm font-bold",
                                axis.score >= 7
                                  ? "text-green-500"
                                  : axis.score >= 5
                                  ? "text-amber-500"
                                  : "text-red-500"
                              )}
                            >
                              {axis.score}/10
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full transition-all",
                                axis.score >= 7
                                  ? "bg-green-500"
                                  : axis.score >= 5
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              )}
                              style={{ width: `${axis.score * 10}%` }}
                            />
                          </div>
                          {axis.notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {axis.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="pass-reasons" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  Top Pass Reasons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.passReasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Evidence to Flip
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {result.evidenceToFlip.map((item, i) => (
                    <li key={i} className="border-b pb-4 last:border-0 last:pb-0">
                      <p className="font-medium text-red-600 dark:text-red-400 mb-1">
                        {item.passReason}
                      </p>
                      <p className="text-muted-foreground flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 mt-1 text-green-500 flex-shrink-0" />
                        {item.evidenceNeeded}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {result.hiddenFiltersTriggered.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    Hidden VC Filters Triggered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.hiddenFiltersTriggered.map((filter, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-amber-700 dark:text-amber-300"
                      >
                        <Minus className="w-4 h-4" />
                        {filter}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="de-risk" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  De-Risking Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.deRiskingActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <ArrowRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {result.deckRecommendation && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    Deck Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    {result.deckRecommendation.needed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">
                        {result.deckRecommendation.needed
                          ? `${result.deckRecommendation.type === "deck" ? "Full Deck" : "1-2 Page Summary"} Recommended`
                          : "Deck Not Needed Yet"}
                      </p>
                      <p className="text-muted-foreground mt-1">
                        {result.deckRecommendation.reason}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="milestones" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  {result.milestoneMap.timeframe} Milestone Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.milestoneMap.milestones.map((milestone, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <span>{milestone}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-center">
          <Button variant="outline" onClick={handleReset}>
            Run Another Evaluation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Investor Readiness Evaluation</CardTitle>
          <p className="text-muted-foreground">
            Get an IC-style evaluation of your startup using the Investor Lens
            framework.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Investment Stage
            </label>
            <Select
              value={stage}
              onValueChange={(v) => setStage(v as InvestorStage)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                <SelectItem value="seed">Seed</SelectItem>
                <SelectItem value="series-a">Series A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Describe your business
            </label>
            <Textarea
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              placeholder="What does your company do? Who is the target customer? What's your traction? How is it differentiated?"
              className="min-h-[150px]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">
                Current Traction (optional)
              </label>
              <Input
                value={traction}
                onChange={(e) => setTraction(e.target.value)}
                placeholder="e.g., $50K MRR, 1000 users"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Raise Amount (optional)
              </label>
              <Input
                value={askAmount}
                onChange={(e) => setAskAmount(e.target.value)}
                placeholder="e.g., $2M"
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </motion.div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!businessDescription.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Run Evaluation
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
