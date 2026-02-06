"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  Rocket,
  Target,
  TrendingUp,
  LineChart,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  DollarSign,
  Users,
  BarChart3,
  Brain,
  Loader2,
  Mail,
  Lock,
  Sparkles,
  PartyPopper,
} from "lucide-react";

// Types
type Step = 1 | 2 | 3 | "wink";
type Stage = "ideation" | "pre-seed" | "seed" | "series-a";
type Challenge =
  | "product-market-fit"
  | "fundraising"
  | "team-building"
  | "growth-scaling"
  | "unit-economics"
  | "strategic-planning";

interface StageOption {
  id: Stage;
  title: string;
  description: string;
  icon: typeof Rocket;
}

interface ChallengeOption {
  id: Challenge;
  title: string;
  description: string;
  icon: typeof Target;
}

const OnboardingPage = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stage options - simplified
  const stages: StageOption[] = [
    {
      id: "ideation",
      title: "Ideation",
      description: "Validating ideas & finding fit",
      icon: Lightbulb,
    },
    {
      id: "pre-seed",
      title: "Pre-seed",
      description: "Building MVP & first customers",
      icon: Rocket,
    },
    {
      id: "seed",
      title: "Seed",
      description: "Scaling & proving economics",
      icon: TrendingUp,
    },
    {
      id: "series-a",
      title: "Series A+",
      description: "Optimizing growth",
      icon: LineChart,
    },
  ];

  // Challenge options
  const challenges: ChallengeOption[] = [
    {
      id: "product-market-fit",
      title: "Product-Market Fit",
      description: "Validate your solution",
      icon: Target,
    },
    {
      id: "fundraising",
      title: "Fundraising",
      description: "Secure capital",
      icon: DollarSign,
    },
    {
      id: "team-building",
      title: "Team Building",
      description: "Hire & scale team",
      icon: Users,
    },
    {
      id: "growth-scaling",
      title: "Growth & Scaling",
      description: "Accelerate growth",
      icon: BarChart3,
    },
    {
      id: "unit-economics",
      title: "Unit Economics",
      description: "Optimize your model",
      icon: TrendingUp,
    },
    {
      id: "strategic-planning",
      title: "Strategy",
      description: "Make better decisions",
      icon: Brain,
    },
  ];

  // Trigger confetti on wink step
  useEffect(() => {
    if (currentStep === "wink") {
      // Initial burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ff6a1a", "#f97316", "#fb923c", "#fed7aa"],
      });

      // Side bursts
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ["#ff6a1a", "#f97316", "#fb923c"],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ["#ff6a1a", "#f97316", "#fb923c"],
        });
      }, 200);

      // Redirect after celebration
      const timeout = setTimeout(() => {
        router.push("/dashboard?welcome=true");
      }, 2500);

      return () => clearTimeout(timeout);
    }
  }, [currentStep, router]);

  const handleStageSelect = (stage: Stage) => {
    setSelectedStage(stage);
    // Auto-advance after short delay for smooth UX
    setTimeout(() => setCurrentStep(2), 300);
  };

  const handleChallengeSelect = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    // Auto-advance after short delay
    setTimeout(() => setCurrentStep(3), 300);
  };

  const handleBack = () => {
    if (currentStep === 2) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
          stage: selectedStage,
          challenges: selectedChallenge ? [selectedChallenge] : [],
          isQuickOnboard: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      // Show the wink!
      setCurrentStep("wink");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  // Progress dots
  const stepNumber = currentStep === "wink" ? 3 : currentStep;

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-950 overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="w-full py-6 px-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <img src="/sahara-logo.svg" alt="Sahara" className="h-8 w-auto" />
              </Link>

              {/* Progress dots */}
              {currentStep !== "wink" && (
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        step === stepNumber
                          ? "bg-[#ff6a1a] scale-125"
                          : step < stepNumber
                          ? "bg-[#ff6a1a]/60"
                          : "bg-gray-300 dark:bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Steps content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-2xl">
            <AnimatePresence mode="wait">
              {/* Step 1: Choose Stage - CLICK 1 */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="text-center space-y-3">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#ff6a1a]/10 text-[#ff6a1a] rounded-full text-sm font-medium"
                    >
                      <Sparkles className="w-4 h-4" />
                      3 clicks to get started
                    </motion.div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                      What stage are you at?
                    </h1>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {stages.map((stage, index) => (
                      <motion.button
                        key={stage.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleStageSelect(stage.id)}
                        className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                          selectedStage === stage.id
                            ? "border-[#ff6a1a] bg-[#ff6a1a]/5 shadow-lg shadow-[#ff6a1a]/10"
                            : "border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/50 bg-white dark:bg-gray-900"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                              selectedStage === stage.id
                                ? "bg-[#ff6a1a] text-white"
                                : "bg-[#ff6a1a]/10 text-[#ff6a1a]"
                            }`}
                          >
                            <stage.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {stage.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {stage.description}
                            </p>
                          </div>
                          {selectedStage === stage.id && (
                            <CheckCircle2 className="w-5 h-5 text-[#ff6a1a] flex-shrink-0" />
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Choose Challenge - CLICK 2 */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="text-center space-y-3">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                      What's your <span className="text-[#ff6a1a]">#1 challenge</span>?
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      We'll customize your experience
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {challenges.map((challenge, index) => (
                      <motion.button
                        key={challenge.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleChallengeSelect(challenge.id)}
                        className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                          selectedChallenge === challenge.id
                            ? "border-[#ff6a1a] bg-[#ff6a1a]/5 shadow-lg shadow-[#ff6a1a]/10"
                            : "border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/50 bg-white dark:bg-gray-900"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 transition-colors ${
                            selectedChallenge === challenge.id
                              ? "bg-[#ff6a1a] text-white"
                              : "bg-[#ff6a1a]/10 text-[#ff6a1a]"
                          }`}
                        >
                          <challenge.icon className="w-4 h-4" />
                        </div>
                        <h3 className="font-medium text-sm text-gray-900 dark:text-white">
                          {challenge.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {challenge.description}
                        </p>
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex justify-start">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="gap-2 text-gray-600 dark:text-gray-400"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Enter Email - CLICK 3 */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="text-center space-y-3">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                      Let's <span className="text-[#ff6a1a]">get started</span>!
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      Create your account
                    </p>
                  </div>

                  <div className="max-w-md mx-auto">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-lg">
                      {/* Summary chips */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {selectedStage && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6a1a]/10 text-[#ff6a1a] rounded-full text-sm font-medium">
                            {(() => {
                              const Icon = stages.find((s) => s.id === selectedStage)!.icon;
                              return <Icon className="w-3.5 h-3.5" />;
                            })()}
                            {stages.find((s) => s.id === selectedStage)?.title}
                          </span>
                        )}
                        {selectedChallenge && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-sm font-medium">
                            {challenges.find((c) => c.id === selectedChallenge)?.title}
                          </span>
                        )}
                      </div>

                      {/* Email input */}
                      <div className="space-y-4">
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="email"
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoFocus
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 focus:bg-white dark:focus:bg-gray-900 outline-none transition-all text-lg"
                          />
                        </div>

                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="password"
                            placeholder="Create a password (6+ chars)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 focus:bg-white dark:focus:bg-gray-900 outline-none transition-all text-lg"
                          />
                        </div>

                        {error && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-red-500"
                          >
                            {error}
                          </motion.p>
                        )}

                        <Button
                          size="lg"
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white text-lg py-6 shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40 transition-all disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              Start Free Trial
                              <ArrowRight className="w-5 h-5 ml-2" />
                            </>
                          )}
                        </Button>

                        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                          No credit card required
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="gap-2 text-gray-600 dark:text-gray-400"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* The Wink! - Celebration */}
              {currentStep === "wink" && (
                <motion.div
                  key="wink"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6 py-12"
                >
                  <motion.div
                    initial={{ rotate: -10, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-[#ff6a1a] to-orange-500 shadow-2xl shadow-[#ff6a1a]/40"
                  >
                    <PartyPopper className="w-12 h-12 text-white" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-3"
                  >
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
                      You're in! 🎉
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400">
                      Welcome to Sahara
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center justify-center gap-2 text-[#ff6a1a]"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Preparing your dashboard...</span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default OnboardingPage;
