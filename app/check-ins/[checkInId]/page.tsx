"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, MessageSquare, Lightbulb, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { GradientBg } from "@/components/premium/GradientBg";

const mockCheckIn = {
  id: "2",
  date: "Dec 23, 2024",
  time: "9:00 AM",
  type: "progress",
  status: "completed" as const,
  response: "Made great progress on Q1 planning. Team aligned on priorities and ready to execute. We've finalized our product roadmap and secured buy-in from all stakeholders. Next week we'll start sprint planning.",
  analysis: "Strong momentum detected! Your team alignment and stakeholder buy-in are critical success factors. The transition from planning to execution is well-timed.",
  actionItems: [
    "Schedule sprint planning sessions for next week",
    "Document Q1 roadmap decisions for reference",
    "Set up weekly sync with stakeholders to maintain alignment",
  ],
};

export default function CheckInDetailPage({
  params,
}: {
  params: Promise<{ checkInId: string }>;
}) {
  const { checkInId } = use(params);

  return (
    <div className="min-h-screen relative">
      <GradientBg variant="spotlight" className="opacity-20" />

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Link href="/check-ins">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Check-Ins
            </Button>
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground capitalize">
                {mockCheckIn.type} Check-In
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {mockCheckIn.date}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {mockCheckIn.time}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl bg-white/5 dark:bg-black/5 p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Your Response</h2>
              </div>
              <p className="text-foreground/80 leading-relaxed">{mockCheckIn.response}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl border border-purple-500/30 backdrop-blur-xl bg-white/5 dark:bg-black/5 p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Lightbulb className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">AI Analysis</h2>
              </div>
              <p className="text-foreground/80 leading-relaxed">{mockCheckIn.analysis}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative overflow-hidden rounded-2xl border border-blue-500/30 backdrop-blur-xl bg-white/5 dark:bg-black/5 p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20" />
            <div className="relative z-10">
              <h2 className="text-xl font-semibold text-foreground mb-4">Suggested Action Items</h2>
              <div className="space-y-3">
                {mockCheckIn.actionItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="mt-1 w-5 h-5 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex-shrink-0" />
                    <p className="text-foreground/80">{item}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex gap-4"
          >
            <Button className="flex-1 bg-gradient-to-r from-primary to-primary/80">
              Export to Tasks
            </Button>
            <Button variant="outline" className="flex-1">
              Share Progress
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
