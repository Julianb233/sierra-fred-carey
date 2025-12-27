"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GradientText, FadeUp, WordReveal } from "@/components/premium/AnimatedText";
import { GlassCard3D } from "@/components/premium/Card3D";
import { GradientBg, FloatingOrbs } from "@/components/premium/GradientBg";
import Footer from "@/components/footer";
import Link from "next/link";
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
  Clock
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
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [selectedChallenges, setSelectedChallenges] = useState<Challenge[]>([]);

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

  // Progress percentage
  const progress = (currentStep / 4) * 100;

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background effects */}
      <GradientBg variant="mesh" />
      <FloatingOrbs />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header with progress */}
        <header className="w-full py-6 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity">
                <GradientText>Decision OS</GradientText>
              </Link>
              <div className="text-sm text-muted-foreground">
                Step {currentStep} of 4
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-card/50 rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-purple-500 to-pink-500"
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
                    <FadeUp>
                      <h1 className="text-4xl md:text-6xl font-bold">
                        Welcome to your{" "}
                        <GradientText from="from-primary" via="via-purple-500" to="to-pink-500">
                          Decision OS
                        </GradientText>
                      </h1>
                    </FadeUp>
                    <FadeUp delay={0.2}>
                      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        The AI-powered operating system that helps startup founders make better
                        decisions faster
                      </p>
                    </FadeUp>
                  </div>

                  <FadeUp delay={0.4}>
                    <div className="grid md:grid-cols-3 gap-6 mt-12">
                      <GlassCard3D className="p-6">
                        <div className="space-y-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Zap className="w-6 h-6 text-primary" />
                          </div>
                          <h3 className="font-semibold text-lg">Make Faster Decisions</h3>
                          <p className="text-sm text-muted-foreground">
                            Cut through noise with AI-powered insights tailored to your startup stage
                          </p>
                        </div>
                      </GlassCard3D>

                      <GlassCard3D className="p-6">
                        <div className="space-y-3">
                          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-purple-500" />
                          </div>
                          <h3 className="font-semibold text-lg">Increase Confidence</h3>
                          <p className="text-sm text-muted-foreground">
                            Back every decision with data, frameworks, and proven strategies
                          </p>
                        </div>
                      </GlassCard3D>

                      <GlassCard3D className="p-6">
                        <div className="space-y-3">
                          <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-pink-500" />
                          </div>
                          <h3 className="font-semibold text-lg">Save Time</h3>
                          <p className="text-sm text-muted-foreground">
                            Focus on execution while your OS handles analysis and recommendations
                          </p>
                        </div>
                      </GlassCard3D>
                    </div>
                  </FadeUp>

                  <FadeUp delay={0.6} className="flex justify-center mt-12">
                    <Button
                      size="lg"
                      onClick={handleNext}
                      className="group relative overflow-hidden bg-primary hover:bg-primary/90"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Get Started
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </Button>
                  </FadeUp>
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
                    <FadeUp>
                      <h2 className="text-3xl md:text-5xl font-bold">
                        What <GradientText>stage</GradientText> are you at?
                      </h2>
                    </FadeUp>
                    <FadeUp delay={0.1}>
                      <p className="text-lg text-muted-foreground">
                        We'll customize your experience based on your current journey
                      </p>
                    </FadeUp>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mt-12">
                    {stages.map((stage, index) => (
                      <FadeUp key={stage.id} delay={0.2 + index * 0.1}>
                        <GlassCard3D
                          className={`p-6 cursor-pointer transition-all duration-300 ${
                            selectedStage === stage.id
                              ? "ring-2 ring-primary shadow-primary/30"
                              : "hover:shadow-lg"
                          }`}
                          glowColor={selectedStage === stage.id ? "primary" : undefined}
                        >
                          <button
                            onClick={() => setSelectedStage(stage.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start gap-4">
                              <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                                  selectedStage === stage.id
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-primary/10 text-primary"
                                }`}
                              >
                                <stage.icon className="w-6 h-6" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <h3 className="font-semibold text-xl">{stage.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {stage.description}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {stage.metrics.map((metric) => (
                                    <span
                                      key={metric}
                                      className="text-xs px-2 py-1 rounded-full bg-muted/50 text-muted-foreground"
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
                                  <CheckCircle2 className="w-6 h-6 text-primary" />
                                </motion.div>
                              )}
                            </div>
                          </button>
                        </GlassCard3D>
                      </FadeUp>
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
                    <FadeUp>
                      <h2 className="text-3xl md:text-5xl font-bold">
                        What are your biggest{" "}
                        <GradientText>challenges</GradientText>?
                      </h2>
                    </FadeUp>
                    <FadeUp delay={0.1}>
                      <p className="text-lg text-muted-foreground">
                        Select all that apply - we'll prioritize these in your dashboard
                      </p>
                    </FadeUp>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-12">
                    {challenges.map((challenge, index) => (
                      <FadeUp key={challenge.id} delay={0.2 + index * 0.05}>
                        <GlassCard3D
                          className={`p-5 cursor-pointer transition-all duration-300 ${
                            selectedChallenges.includes(challenge.id)
                              ? "ring-2 ring-primary shadow-primary/30"
                              : "hover:shadow-lg"
                          }`}
                          glowColor={
                            selectedChallenges.includes(challenge.id) ? "primary" : undefined
                          }
                        >
                          <button
                            onClick={() => toggleChallenge(challenge.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start gap-4">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                  selectedChallenges.includes(challenge.id)
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-primary/10 text-primary"
                                }`}
                              >
                                <challenge.icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 space-y-1">
                                <h3 className="font-semibold">{challenge.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {challenge.description}
                                </p>
                              </div>
                              {selectedChallenges.includes(challenge.id) && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                >
                                  <CheckCircle2 className="w-5 h-5 text-primary" />
                                </motion.div>
                              )}
                            </div>
                          </button>
                        </GlassCard3D>
                      </FadeUp>
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
                    <FadeUp>
                      <h2 className="text-3xl md:text-5xl font-bold">
                        You're all set! Let's{" "}
                        <GradientText>get started</GradientText>
                      </h2>
                    </FadeUp>
                    <FadeUp delay={0.1}>
                      <p className="text-lg text-muted-foreground">
                        Create your account to unlock your personalized Decision OS
                      </p>
                    </FadeUp>
                  </div>

                  <FadeUp delay={0.3}>
                    <GlassCard3D className="p-8 md:p-12 max-w-2xl mx-auto">
                      <div className="space-y-8">
                        {/* Summary of selections */}
                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg">Your personalized setup:</h3>

                          <div className="space-y-3">
                            {selectedStage && (
                              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  {stages.find((s) => s.id === selectedStage)?.icon && (
                                    <div className="text-primary">
                                      {(() => {
                                        const Icon = stages.find((s) => s.id === selectedStage)!.icon;
                                        return <Icon className="w-4 h-4" />;
                                      })()}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    {stages.find((s) => s.id === selectedStage)?.title} Stage
                                  </p>
                                </div>
                              </div>
                            )}

                            {selectedChallenges.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                  Focus areas ({selectedChallenges.length}):
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {selectedChallenges.map((challengeId) => {
                                    const challenge = challenges.find((c) => c.id === challengeId);
                                    return (
                                      <span
                                        key={challengeId}
                                        className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium"
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

                        <div className="h-px bg-border" />

                        {/* CTA Buttons */}
                        <div className="space-y-4">
                          <Button size="lg" className="w-full" asChild>
                            <Link href="/pricing">
                              Start Free Trial
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                          </Button>

                          <div className="text-center text-sm text-muted-foreground">
                            No credit card required • 14-day free trial
                          </div>
                        </div>

                        {/* Features list */}
                        <div className="space-y-3 pt-4">
                          <p className="text-sm font-medium">What you'll get:</p>
                          <ul className="space-y-2">
                            {[
                              "AI-powered decision recommendations",
                              "Custom frameworks for your stage",
                              "Real-time metrics tracking",
                              "Strategic planning tools",
                              "Priority support"
                            ].map((feature) => (
                              <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </GlassCard3D>
                  </FadeUp>
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
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>

                <Button
                  size="lg"
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="gap-2 bg-primary hover:bg-primary/90"
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
                <Button variant="ghost" onClick={handleBack} className="gap-2">
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
