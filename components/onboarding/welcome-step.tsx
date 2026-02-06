"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Target, Brain, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
  const features = [
    {
      icon: Brain,
      title: "AI Co-Founder",
      description: "Get real-time advice from someone who's built 40+ companies",
    },
    {
      icon: Target,
      title: "Decision Framework",
      description: "Make better decisions with 7-factor analysis and scoring",
    },
    {
      icon: Sparkles,
      title: "Reality Lens",
      description: "Get an honest 5-factor assessment of your startup idea",
    },
    {
      icon: Clock,
      title: "24/7 Available",
      description: "Access advice whenever you need it, day or night",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center max-w-2xl mx-auto"
    >
      {/* Avatar */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#ff6a1a] to-orange-400 flex items-center justify-center"
      >
        <span className="text-4xl font-bold text-white">F</span>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4"
      >
        Meet Fred Cary
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-lg text-gray-600 dark:text-gray-400 mb-8"
      >
        Your AI co-founder with 50 years of experience building companies.
        From taco stands to public companies — I've seen it all.
      </motion.p>

      {/* Features grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-left"
          >
            <div className="p-2 rounded-lg bg-[#ff6a1a]/10">
              <feature.icon className="h-5 w-5 text-[#ff6a1a]" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Quote */}
      <motion.blockquote
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mb-8 p-4 border-l-4 border-[#ff6a1a] bg-gray-50 dark:bg-gray-800/50 rounded-r-lg text-left"
      >
        <p className="text-gray-700 dark:text-gray-300 italic">
          "F**k average, be legendary. Let's build something extraordinary together."
        </p>
        <cite className="text-sm text-gray-500 mt-2 block">— Fred Cary</cite>
      </motion.blockquote>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-3"
      >
        <Button
          size="lg"
          onClick={onNext}
          className="w-full sm:w-auto bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
        >
          Let's Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button
          size="lg"
          variant="ghost"
          onClick={onSkip}
          className="w-full sm:w-auto text-gray-500"
        >
          Skip for now
        </Button>
      </motion.div>
    </motion.div>
  );
}
