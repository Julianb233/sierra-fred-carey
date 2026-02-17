"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  MessageSquare,
  History,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface CompleteStepProps {
  startupName?: string;
}

export function CompleteStep({ startupName }: CompleteStepProps) {
  const router = useRouter();

  // Trigger confetti on mount
  useEffect(() => {
    const duration = 2000;
    const end = Date.now() + duration;

    const colors = ["#ff6a1a", "#fb923c", "#f59e0b"];

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  const quickLinks = [
    {
      icon: MessageSquare,
      title: "Chat with FRED",
      description: "Get advice on your next move",
      href: "/chat",
    },
    {
      icon: History,
      title: "Decision History",
      description: "Track your conversations",
      href: "/dashboard/history",
    },
    {
      icon: Sparkles,
      title: "Reality Lens",
      description: "Assess your startup idea",
      href: "/dashboard",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center max-w-xl mx-auto"
    >
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
      >
        <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold text-gray-900 dark:text-white mb-4"
      >
        You&apos;re All Set!
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-lg text-gray-600 dark:text-gray-400 mb-8"
      >
        {startupName ? (
          <>
            <span className="font-medium text-[#ff6a1a]">{startupName}</span> is
            now set up and ready to go.
          </>
        ) : (
          "Your account is set up and ready to go."
        )}
        {" "}Let&apos;s build something legendary.
      </motion.p>

      {/* Quick links */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-3 mb-8"
      >
        {quickLinks.map((link, index) => (
          <motion.button
            key={link.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            onClick={() => router.push(link.href)}
            className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#ff6a1a]/50 hover:bg-[#ff6a1a]/5 transition-all flex items-center gap-4 text-left group"
          >
            <div className="p-2 rounded-lg bg-[#ff6a1a]/10 group-hover:bg-[#ff6a1a]/20 transition-colors">
              <link.icon className="h-5 w-5 text-[#ff6a1a]" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">
                {link.title}
              </p>
              <p className="text-sm text-gray-500">{link.description}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#ff6a1a] group-hover:translate-x-1 transition-all" />
          </motion.button>
        ))}
      </motion.div>

      {/* Main CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Button
          size="lg"
          onClick={() => router.push("/dashboard")}
          className="w-full sm:w-auto bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
        >
          Go to Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
