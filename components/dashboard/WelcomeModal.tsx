"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  X,
  Rocket,
  Target,
  BarChart3,
  Brain,
  Sparkles,
  ArrowRight,
  Play,
} from "lucide-react";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userStage?: string;
  userChallenge?: string;
}

export function WelcomeModal({
  isOpen,
  onClose,
  userName,
  userStage,
  userChallenge,
}: WelcomeModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: Sparkles,
      title: `Welcome${userName ? `, ${userName.split(" ")[0]}` : ""}!`,
      description:
        "Your personalized startup operating system is ready. Let's take a quick tour of what you can do.",
      color: "from-[#ff6a1a] to-orange-500",
    },
    {
      icon: Target,
      title: "Reality Lens",
      description:
        "Get an honest 5-factor assessment of your startup idea — feasibility, economics, demand, distribution, and timing.",
      color: "from-purple-500 to-indigo-500",
    },
    {
      icon: BarChart3,
      title: "AI Insights",
      description:
        "See patterns across your conversations with Fred — key decisions, progress trends, and recommendations tailored to your stage.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Brain,
      title: "Your Journey",
      description:
        "Follow a curated roadmap based on your stage and challenges. Every milestone brings you closer to success.",
      color: "from-green-500 to-emerald-500",
    },
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onClose();
    }
  };

  const skipTour = () => {
    onClose();
  };

  // Reset slide when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => setCurrentSlide(0), 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const CurrentIcon = slides[currentSlide].icon;
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={skipTour}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg mx-4"
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header with close button */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  {slides.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentSlide
                          ? "w-6 bg-[#ff6a1a]"
                          : idx < currentSlide
                          ? "w-1.5 bg-[#ff6a1a]/50"
                          : "w-1.5 bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={skipTour}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="text-center space-y-6"
                  >
                    {/* Icon */}
                    <div className="flex justify-center">
                      <div
                        className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${slides[currentSlide].color} flex items-center justify-center shadow-lg`}
                      >
                        <CurrentIcon className="w-10 h-10 text-white" />
                      </div>
                    </div>

                    {/* Text */}
                    <div className="space-y-3">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {slides[currentSlide].title}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        {slides[currentSlide].description}
                      </p>
                    </div>

                    {/* User context on first slide */}
                    {currentSlide === 0 && (userStage || userChallenge) && (
                      <div className="flex flex-wrap justify-center gap-2 pt-2">
                        {userStage && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6a1a]/10 text-[#ff6a1a] rounded-full text-sm font-medium">
                            <Rocket className="w-3.5 h-3.5" />
                            {userStage} Stage
                          </span>
                        )}
                        {userChallenge && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-sm font-medium">
                            <Target className="w-3.5 h-3.5" />
                            {userChallenge}
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-8 pb-8 flex items-center justify-between">
                <button
                  onClick={skipTour}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  Skip tour
                </button>

                <Button
                  onClick={nextSlide}
                  className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white gap-2 shadow-lg shadow-[#ff6a1a]/25"
                >
                  {isLastSlide ? (
                    <>
                      <Play className="w-4 h-4" />
                      Let&apos;s Go!
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
