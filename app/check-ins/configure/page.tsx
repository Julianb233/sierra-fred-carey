"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, MessageSquare, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PhoneVerify } from "@/components/check-ins/PhoneVerify";
import Footer from "@/components/footer";
import { logger } from "@/lib/logger";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const CHECK_IN_TYPES = [
  { id: "motivation", label: "Motivation", description: "What's driving you this week?", icon: "🔥" },
  { id: "progress", label: "Progress", description: "What did you accomplish?", icon: "📈" },
  { id: "blockers", label: "Blockers", description: "What's holding you back?", icon: "🚧" },
];

export default function ConfigureCheckInsPage() {
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [selectedType, setSelectedType] = useState("motivation");
  const [phoneVerified, setPhoneVerified] = useState(false);

  const handleSave = () => {
    logger.log({ selectedDay, selectedTime, selectedType });
  };

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
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-gray-900 dark:text-white">
            Configure <span className="text-[#ff6a1a]">Check-Ins</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Set up your weekly accountability schedule
          </p>
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
                <Calendar className="w-5 h-5 text-[#ff6a1a]" />
                <Label className="text-base font-medium text-gray-900 dark:text-white">Day of Week</Label>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all ${
                      selectedDay === day
                        ? "bg-[#ff6a1a] text-white shadow-lg shadow-[#ff6a1a]/25 scale-105"
                        : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff6a1a]/5 to-orange-400/5" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-[#ff6a1a]" />
                <Label className="text-base font-medium text-gray-900 dark:text-white">Time</Label>
              </div>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]/20 focus:border-[#ff6a1a]"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff6a1a]/5 to-orange-400/5" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-[#ff6a1a]" />
                <Label className="text-base font-medium text-gray-900 dark:text-white">Check-In Type</Label>
              </div>
              <div className="space-y-3">
                {CHECK_IN_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      selectedType === type.id
                        ? "bg-[#ff6a1a]/10 border-2 border-[#ff6a1a]"
                        : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{type.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white mb-1">{type.label}</p>
                        <p className="text-sm text-gray-500">{type.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <PhoneVerify onVerified={() => setPhoneVerified(true)} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative overflow-hidden rounded-2xl border border-[#ff6a1a]/20 bg-white dark:bg-gray-900 p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff6a1a]/10 to-orange-400/10" />
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sample Message</h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 font-mono text-sm text-gray-600 dark:text-gray-400">
                <p className="mb-2">Hey! It&apos;s your weekly check-in.</p>
                <p>
                  {CHECK_IN_TYPES.find((t) => t.id === selectedType)?.description}
                </p>
                <p className="mt-2 text-gray-400 dark:text-gray-500 text-xs">
                  Reply to this message to log your response.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={handleSave}
              disabled={!phoneVerified}
              className="w-full py-6 text-lg bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 disabled:opacity-50"
            >
              <Save className="w-5 h-5 mr-2" />
              Save Configuration
            </Button>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
