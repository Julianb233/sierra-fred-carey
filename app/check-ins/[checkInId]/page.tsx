"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, MessageSquare, Lightbulb, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/footer";

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
    <div className="min-h-screen bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Link href="/check-ins">
            <Button variant="ghost" className="mb-6 text-gray-600 dark:text-gray-400 hover:text-[#ff6a1a]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Check-Ins
            </Button>
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white capitalize">
                {mockCheckIn.type} Check-In
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
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
            className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff6a1a]/5 to-orange-400/5" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-[#ff6a1a]" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Response</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{mockCheckIn.response}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl border border-[#ff6a1a]/20 bg-white dark:bg-gray-900 p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff6a1a]/10 to-orange-400/10" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-[#ff6a1a]/20">
                  <Lightbulb className="w-5 h-5 text-[#ff6a1a]" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI Analysis</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{mockCheckIn.analysis}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-white dark:bg-gray-900 p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-400/10" />
            <div className="relative z-10">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Suggested Action Items</h2>
              <div className="space-y-3">
                {mockCheckIn.actionItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="mt-1 w-5 h-5 rounded-full bg-[#ff6a1a]/20 border-2 border-[#ff6a1a]/50 flex-shrink-0" />
                    <p className="text-gray-600 dark:text-gray-400">{item}</p>
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
            <Button className="flex-1 bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25">
              Export to Tasks
            </Button>
            <Button variant="outline" className="flex-1 hover:border-[#ff6a1a]/30 hover:text-[#ff6a1a]">
              Share Progress
            </Button>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
