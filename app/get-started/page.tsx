"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Footer from "@/components/footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Zap,
  Brain,
  Shield,
  Clock,
  Loader2,
  Mail,
  User,
  UserPlus,
  X,
  Plus
} from "lucide-react";

// Types
type Step = 1 | 2 | 3 | 4;

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
  metrics: string[];
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
  const [selectedChallenges, setSelectedChallenges] = useState<Challenge[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [teammateEmail, setTeammateEmail] = useState("");
  const [teammateEmails, setTeammateEmails] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add teammate email
  const addTeammate = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (teammateEmail && emailRegex.test(teammateEmail) && !teammateEmails.includes(teammateEmail.toLowerCase())) {
      setTeammateEmails([...teammateEmails, teammateEmail.toLowerCase()]);
      setTeammateEmail("");
    }
  };

  const removeTeammate = (emailToRemove: string) => {
    setTeammateEmails(teammateEmails.filter(e => e !== emailToRemove));
  };

  // Stage options
  const stages: StageOption[] = [
    {
      id: "ideation",
      title: "Ideation",
      description: "Validating ideas, finding problem-solution fit",
      icon: Lightbulb,
      metrics: ["Customer interviews", "Problem validation", "MVP planning"]
    },
    {
      id: "pre-seed",
      title: "Pre-seed",
      description: "Building MVP, getting first customers",
      icon: Rocket,
      metrics: ["First revenue", "Product validation", "Early traction"]
    },
    {
      id: "seed",
      title: "Seed",
      description: "Scaling product, proving unit economics",
      icon: TrendingUp,
      metrics: ["PMF validation", "Revenue growth", "Team scaling"]
    },
    {
      id: "series-a",
      title: "Series A+",
      description: "Scaling operations, optimizing growth",
      icon: LineChart,
      metrics: ["Market expansion", "Operational excellence", "Profitability path"]
    }
  ];

  // Challenge options
  const challenges: ChallengeOption[] = [
    {
      id: "product-market-fit",
      title: "Finding Product-Market Fit",
      description: "Validating that your product solves a real problem",
      icon: Target
    },
    {
      id: "fundraising",
      title: "Fundraising Strategy",
      description: "Securing capital and managing investor relationships",
      icon: DollarSign
    },
    {
      id: "team-building",
      title: "Team Building",
      description: "Hiring, retaining, and scaling your team",
      icon: Users
    },
    {
      id: "growth-scaling",
      title: "Growth & Scaling",
      description: "Accelerating growth while maintaining quality",
      icon: BarChart3
    },
    {
      id: "unit-economics",
      title: "Unit Economics",
      description: "Understanding and optimizing your business model",
      icon: TrendingUp
    },
    {
      id: "strategic-planning",
      title: "Strategic Planning",
      description: "Making better decisions faster with confidence",
      icon: Brain
    }
  ];

  const toggleChallenge = (challengeId: Challenge) => {
    setSelectedChallenges((prev) =>
      prev.includes(challengeId)
        ? prev.filter((id) => id !== challengeId)
        : [...prev, challengeId]
    );
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const canProceed = () => {
    if (currentStep === 2) return selectedStage !== null;
    if (currentStep === 3) return selectedChallenges.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          stage: selectedStage,
          challenges: selectedChallenges,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Progress percentage
  const progress = (currentStep / 4) * 100;

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-950 overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-[150px]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header with progress */}
        <header className="w-full py-6 px-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <img src="/sahara-logo.svg" alt="Sahara" className="h-8 w-auto" />
              </Link>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Step {currentStep} of 4
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#ff6a1a] to-orange-400"
                initial={{ width: "25%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
          </div>
        </header>

        {/* Steps content */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-4xl">
            <AnimatePresence mode="wait">
              {/* Step 1: Welcome */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-8"
                >
                  <div className="text-center space-y-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium mb-2"
                    >
                      <Clock className="w-4 h-4" />
                      Takes 2 minutes • Get your personalized plan
                    </motion.div>
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white"
                    >
                      Let&apos;s get you{" "}
                      <span className="text-[#ff6a1a]">investor-ready</span>
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
                    >
                      Answer 3 quick questions and we&apos;ll build your personalized
                      roadmap to fundraise with confidence
                    </motion.p>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid md:grid-cols-3 gap-6 mt-12"
                  >
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 transition-colors">
                      <div className="space-y-3">
                        <div className="w-12 h-12 rounded-xl bg-[#ff6a1a]/10 flex items-center justify-center">
                          <Zap className="w-6 h-6 text-[#ff6a1a]" />
                        </div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Make Faster Decisions</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Cut through noise with AI-powered insights tailored to your startup stage
                        </p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 transition-colors">
                      <div className="space-y-3">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                          <Shield className="w-6 h-6 text-orange-500" />
                        </div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Increase Confidence</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Back every decision with data, frameworks, and proven strategies
                        </p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 transition-colors">
                      <div className="space-y-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <Clock className="w-6 h-6 text-amber-500" />
                        </div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Save Time</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Focus on execution while your OS handles analysis and recommendations
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-center mt-12"
                  >
                    <Button
                      size="lg"
                      onClick={handleNext}
                      className="group bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40 transition-all"
                    >
                      <span className="flex items-center gap-2">
                        Get Started
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </Button>
                  </motion.div>
                </motion.div>
              )}

              {/* Step 2: Choose Stage */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-8"
                >
                  <div className="text-center space-y-4">
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white"
                    >
                      What <span className="text-[#ff6a1a]">stage</span> are you at?
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-lg text-gray-600 dark:text-gray-400"
                    >
                      We'll customize your experience based on your current journey
                    </motion.p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mt-12">
                    {stages.map((stage, index) => (
                      <motion.div
                        key={stage.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.1 }}
                      >
                        <button
                          onClick={() => setSelectedStage(stage.id)}
                          className={`w-full text-left bg-white dark:bg-gray-900 rounded-2xl p-6 border-2 transition-all duration-300 relative ${
                            selectedStage === stage.id
                              ? "border-[#ff6a1a] shadow-lg shadow-[#ff6a1a]/20"
                              : "border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30"
                          }`}
                        >
                          {/* Checkbox indicator */}
                          <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedStage === stage.id
                              ? "bg-[#ff6a1a] border-[#ff6a1a]"
                              : "border-gray-300 dark:border-gray-600"
                          }`}>
                            {selectedStage === stage.id && (
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                                selectedStage === stage.id
                                  ? "bg-[#ff6a1a] text-white"
                                  : "bg-[#ff6a1a]/10 text-[#ff6a1a]"
                              }`}
                            >
                              <stage.icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 space-y-2 pr-8">
                              <h3 className="font-semibold text-xl text-gray-900 dark:text-white">{stage.title}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {stage.description}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {stage.metrics.map((metric) => (
                                  <span
                                    key={metric}
                                    className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                  >
                                    {metric}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {selectedStage === stage.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              >
                                <CheckCircle2 className="w-6 h-6 text-[#ff6a1a]" />
                              </motion.div>
                            )}
                          </div>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Choose Challenges */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-8"
                >
                  <div className="text-center space-y-4">
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white"
                    >
                      What are your biggest{" "}
                      <span className="text-[#ff6a1a]">challenges</span>?
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-lg text-gray-600 dark:text-gray-400"
                    >
                      Select all that apply - we'll prioritize these in your dashboard
                    </motion.p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-12">
                    {challenges.map((challenge, index) => (
                      <motion.div
                        key={challenge.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                      >
                        <button
                          onClick={() => toggleChallenge(challenge.id)}
                          className={`w-full text-left bg-white dark:bg-gray-900 rounded-xl p-5 border-2 transition-all duration-300 relative ${
                            selectedChallenges.includes(challenge.id)
                              ? "border-[#ff6a1a] shadow-lg shadow-[#ff6a1a]/20"
                              : "border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30"
                          }`}
                        >
                          {/* Checkbox indicator */}
                          <div className={`absolute top-4 right-4 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                            selectedChallenges.includes(challenge.id)
                              ? "bg-[#ff6a1a] border-[#ff6a1a]"
                              : "border-gray-300 dark:border-gray-600"
                          }`}>
                            {selectedChallenges.includes(challenge.id) && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              >
                                <CheckCircle2 className="w-4 h-4 text-white" />
                              </motion.div>
                            )}
                          </div>
                          <div className="flex items-start gap-4 pr-8">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                selectedChallenges.includes(challenge.id)
                                  ? "bg-[#ff6a1a] text-white"
                                  : "bg-[#ff6a1a]/10 text-[#ff6a1a]"
                              }`}
                            >
                              <challenge.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white">{challenge.title}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {challenge.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Create Account */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-8"
                >
                  <div className="text-center space-y-4">
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white"
                    >
                      You're all set! Let's{" "}
                      <span className="text-[#ff6a1a]">get started</span>
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-lg text-gray-600 dark:text-gray-400"
                    >
                      Create your account to unlock your personalized Sahara experience
                    </motion.p>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 md:p-12 max-w-2xl mx-auto border border-gray-200 dark:border-gray-800 shadow-lg">
                      <div className="space-y-8">
                        {/* Summary of selections */}
                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Your personalized setup:</h3>

                          <div className="space-y-3">
                            {selectedStage && (
                              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                                <div className="w-8 h-8 rounded-lg bg-[#ff6a1a]/10 flex items-center justify-center">
                                  {stages.find((s) => s.id === selectedStage)?.icon && (
                                    <div className="text-[#ff6a1a]">
                                      {(() => {
                                        const Icon = stages.find((s) => s.id === selectedStage)!.icon;
                                        return <Icon className="w-4 h-4" />;
                                      })()}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {stages.find((s) => s.id === selectedStage)?.title} Stage
                                  </p>
                                </div>
                              </div>
                            )}

                            {selectedChallenges.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                  Focus areas ({selectedChallenges.length}):
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {selectedChallenges.map((challengeId) => {
                                    const challenge = challenges.find((c) => c.id === challengeId);
                                    return (
                                      <span
                                        key={challengeId}
                                        className="text-xs px-3 py-1.5 rounded-full bg-[#ff6a1a]/10 text-[#ff6a1a] font-medium"
                                      >
                                        {challenge?.title}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="h-px bg-gray-200 dark:bg-gray-800" />

                        {/* Sign Up Form */}
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all"
                              />
                            </div>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input
                                type="email"
                                placeholder="Your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all"
                              />
                            </div>
                          </div>

                          {/* Invite Teammates Section */}
                          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-3">
                              <UserPlus className="w-5 h-5 text-[#ff6a1a]" />
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Invite co-founders or teammates (optional)
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="email"
                                  placeholder="teammate@company.com"
                                  value={teammateEmail}
                                  onChange={(e) => setTeammateEmail(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTeammate())}
                                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 text-sm focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all"
                                />
                              </div>
                              <Button
                                type="button"
                                onClick={addTeammate}
                                variant="outline"
                                size="sm"
                                className="border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/10"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                            {teammateEmails.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {teammateEmails.map((email) => (
                                  <div
                                    key={email}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6a1a]/10 text-[#ff6a1a] rounded-full text-sm"
                                  >
                                    <span>{email}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeTeammate(email)}
                                      className="hover:bg-[#ff6a1a]/20 rounded-full p-0.5"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              They&apos;ll receive an invite email once you sign up
                            </p>
                          </div>

                          {error && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg"
                            >
                              {error}
                            </motion.div>
                          )}

                          <Button
                            size="lg"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40 transition-all disabled:opacity-50"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating your account...
                              </>
                            ) : (
                              <>
                                Start Free Trial
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </>
                            )}
                          </Button>

                          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                            No credit card required • 14-day free trial
                          </div>
                        </div>

                        {/* Features list */}
                        <div className="space-y-3 pt-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">What you'll get:</p>
                          <ul className="space-y-2">
                            {[
                              "AI-powered decision recommendations",
                              "Custom frameworks for your stage",
                              "Real-time metrics tracking",
                              "Strategic planning tools",
                              "Priority support"
                            ].map((feature) => (
                              <li key={feature} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <CheckCircle2 className="w-4 h-4 text-[#ff6a1a] flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation buttons */}
            {currentStep < 4 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-between mt-12"
              >
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="gap-2 text-gray-600 dark:text-gray-400 hover:text-[#ff6a1a]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>

                <Button
                  size="lg"
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="gap-2 bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 disabled:opacity-50 disabled:shadow-none"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {/* Step 4 back button */}
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex justify-center mt-8"
              >
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="gap-2 text-gray-600 dark:text-gray-400 hover:text-[#ff6a1a]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </motion.div>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default OnboardingPage;
