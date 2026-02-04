"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export type Verdict = "Yes" | "No" | "Not Yet";

interface ICVerdictProps {
  verdict: Verdict;
  reasoning: string;
  stage: string;
  confidence: number;
}

const verdictConfig: Record<Verdict, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof CheckCircle;
  label: string;
  description: string;
}> = {
  Yes: {
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    icon: CheckCircle,
    label: "IC Verdict: Yes",
    description: "This company would likely receive an investment recommendation.",
  },
  No: {
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    icon: XCircle,
    label: "IC Verdict: No",
    description: "This company would likely not receive an investment recommendation at this stage.",
  },
  "Not Yet": {
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    icon: Clock,
    label: "IC Verdict: Not Yet",
    description: "Promising but needs more progress before investment consideration.",
  },
};

export function ICVerdict({ verdict, reasoning, stage, confidence }: ICVerdictProps) {
  const config = verdictConfig[verdict];
  const Icon = config.icon;

  return (
    <Card className={cn("overflow-hidden border-2", config.borderColor)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Investment Committee Simulation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Large Verdict Badge */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className={cn(
              "flex flex-col items-center justify-center w-32 h-32 rounded-2xl shrink-0",
              config.bgColor
            )}
          >
            <Icon className={cn("h-10 w-10 mb-2", config.color)} />
            <span className={cn("text-2xl font-bold", config.color)}>{verdict}</span>
          </motion.div>

          <div className="flex-1 space-y-4">
            {/* Stage Context */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Evaluating for:</span>
              <span className="text-sm font-semibold">{stage}</span>
            </div>

            {/* Confidence Score */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-muted-foreground">Confidence</span>
                <span className={cn("text-sm font-bold", config.color)}>{confidence}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className={cn("h-full rounded-full", config.bgColor.replace("/10", "/60"))}
                />
              </div>
            </div>

            {/* Reasoning */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <p className="text-sm font-medium mb-1">Key Reasoning:</p>
              <p className="text-sm text-muted-foreground">{reasoning}</p>
            </div>

            {/* Stage Context Note */}
            <p className="text-xs text-muted-foreground italic">
              {config.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
