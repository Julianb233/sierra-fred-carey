"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  BarChart3,
  DollarSign,
  Handshake,
  Scale,
} from "lucide-react";

export interface VCAxis {
  name: string;
  score: number;
  maxScore: number;
  feedback: string;
  icon: string;
}

interface VCAxesBreakdownProps {
  axes: VCAxis[];
}

const iconMap: Record<string, typeof Users> = {
  team: Users,
  market: TrendingUp,
  problem: AlertTriangle,
  solution: Lightbulb,
  gtm: Target,
  traction: BarChart3,
  business_model: DollarSign,
  fund_fit: Handshake,
  valuation: Scale,
};

const getScoreColor = (score: number, maxScore: number) => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 70) return { bar: "bg-green-500", text: "text-green-600" };
  if (percentage >= 50) return { bar: "bg-amber-500", text: "text-amber-600" };
  return { bar: "bg-red-500", text: "text-red-600" };
};

export function VCAxesBreakdown({ axes }: VCAxesBreakdownProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Core Evaluation Axes</CardTitle>
        <p className="text-sm text-muted-foreground">
          How VCs typically evaluate startups across 9 key dimensions
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {axes.map((axis, index) => {
            const Icon = iconMap[axis.icon] || Target;
            const colors = getScoreColor(axis.score, axis.maxScore);
            const percentage = (axis.score / axis.maxScore) * 100;

            return (
              <motion.div
                key={axis.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <Icon className="h-4 w-4 text-[#ff6a1a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{axis.name}</h4>
                      <span className={cn("text-sm font-bold", colors.text)}>
                        {axis.score}/{axis.maxScore}
                      </span>
                    </div>
                  </div>
                </div>

                <Progress
                  value={percentage}
                  className="h-1.5 mb-2"
                  indicatorClassName={colors.bar}
                />

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {axis.feedback}
                </p>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
