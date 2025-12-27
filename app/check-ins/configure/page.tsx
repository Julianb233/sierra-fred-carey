"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, MessageSquare, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PhoneVerify } from "@/components/check-ins/PhoneVerify";
import { GradientBg } from "@/components/premium/GradientBg";

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
    console.log({ selectedDay, selectedTime, selectedType });
  };

  return (
    <div className="min-h-screen relative">
      <GradientBg variant="aurora" className="opacity-20" />

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
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Configure Check-Ins
          </h1>
          <p className="text-lg text-muted-foreground">
            Set up your weekly accountability schedule
          </p>
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
                <Calendar className="w-5 h-5 text-primary" />
                <Label className="text-base font-medium">Day of Week</Label>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all ${
                      selectedDay === day
                        ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg scale-105"
                        : "bg-white/5 hover:bg-white/10 text-foreground/70 hover:text-foreground"
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
            className="relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl bg-white/5 dark:bg-black/5 p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <Label className="text-base font-medium">Time</Label>
              </div>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-foreground text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl bg-white/5 dark:bg-black/5 p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-primary" />
                <Label className="text-base font-medium">Check-In Type</Label>
              </div>
              <div className="space-y-3">
                {CHECK_IN_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      selectedType === type.id
                        ? "bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary"
                        : "bg-white/5 hover:bg-white/10 border-2 border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{type.icon}</span>
                      <div>
                        <p className="font-semibold text-foreground mb-1">{type.label}</p>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
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
            className="relative overflow-hidden rounded-2xl border border-amber-500/30 backdrop-blur-xl bg-white/5 dark:bg-black/5 p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20" />
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-foreground mb-4">Sample Message</h3>
              <div className="bg-white/10 rounded-lg p-4 font-mono text-sm text-foreground/80">
                <p className="mb-2">Hey! It's your weekly check-in.</p>
                <p>
                  {CHECK_IN_TYPES.find((t) => t.id === selectedType)?.description}
                </p>
                <p className="mt-2 text-muted-foreground text-xs">
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
              className="w-full py-6 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Save className="w-5 h-5 mr-2" />
              Save Configuration
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
