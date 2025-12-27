"use client";

import { motion } from "framer-motion";
import { Calendar, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckInCard } from "@/components/check-ins/CheckInCard";
import { StreakCounter } from "@/components/check-ins/StreakCounter";

const mockCheckIns = [
  {
    id: "1",
    date: "Dec 30, 2024",
    time: "9:00 AM",
    type: "motivation",
    status: "pending" as const,
  },
  {
    id: "2",
    date: "Dec 23, 2024",
    time: "9:00 AM",
    type: "progress",
    status: "completed" as const,
    response: "Made great progress on Q1 planning. Team aligned on priorities and ready to execute.",
  },
  {
    id: "3",
    date: "Dec 16, 2024",
    time: "9:00 AM",
    type: "blockers",
    status: "completed" as const,
    response: "Identified resource constraints. Need to hire 2 more engineers to hit targets.",
  },
  {
    id: "4",
    date: "Dec 9, 2024",
    time: "9:00 AM",
    type: "motivation",
    status: "missed" as const,
  },
];

export default function CheckInsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 relative">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3 text-gray-900 dark:text-white">
                Weekly <span className="text-[#ff6a1a]">Check-Ins</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Stay accountable with automated SMS check-ins
              </p>
            </div>
            <Link href="/check-ins/configure">
              <Button className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40">
                <Plus className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <StreakCounter currentStreak={8} bestStreak={15} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          {[
            { label: "Total Check-Ins", value: "52", icon: Calendar, color: "bg-[#ff6a1a]" },
            { label: "Response Rate", value: "87%", icon: TrendingUp, color: "bg-orange-500" },
            { label: "Current Streak", value: "8 weeks", icon: Calendar, color: "bg-amber-500" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-lg"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Recent Check-Ins</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockCheckIns.map((checkIn, index) => (
              <motion.div
                key={checkIn.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <CheckInCard checkIn={checkIn} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
