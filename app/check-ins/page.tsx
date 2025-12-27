"use client";

import { motion } from "framer-motion";
import { Calendar, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckInCard } from "@/components/check-ins/CheckInCard";
import { StreakCounter } from "@/components/check-ins/StreakCounter";
import { GradientBg } from "@/components/premium/GradientBg";

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
    <div className="min-h-screen relative">
      <GradientBg variant="mesh" className="opacity-30" />

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Weekly Check-Ins
              </h1>
              <p className="text-lg text-muted-foreground">
                Stay accountable with automated SMS check-ins
              </p>
            </div>
            <Link href="/check-ins/configure">
              <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
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
            { label: "Total Check-Ins", value: "52", icon: Calendar, color: "from-blue-500 to-cyan-500" },
            { label: "Response Rate", value: "87%", icon: TrendingUp, color: "from-emerald-500 to-green-500" },
            { label: "Current Streak", value: "8 weeks", icon: Calendar, color: "from-orange-500 to-red-500" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl bg-white/5 dark:bg-black/5 p-6"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10`} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <stat.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Recent Check-Ins</h2>
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
