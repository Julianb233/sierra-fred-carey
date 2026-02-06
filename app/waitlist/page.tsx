"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/footer";
import {
  Rocket,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Mail,
  User,
  Building2,
  Sparkles,
  Users,
  TrendingUp,
  Shield
} from "lucide-react";

const stageOptions = [
  { value: "idea", label: "Idea Stage" },
  { value: "building-mvp", label: "Building MVP" },
  { value: "pre-seed", label: "Pre-seed" },
  { value: "seed", label: "Seed" },
  { value: "series-a-plus", label: "Series A+" },
];

const fundingOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not-sure", label: "Not sure" },
];

const teamOptions = [
  { value: "solo", label: "Solo founder" },
  { value: "co-founder", label: "Have co-founder" },
  { value: "team", label: "Have a team" },
];

export default function WaitlistPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [startupStage, setStartupStage] = useState("");
  const [firstBusiness, setFirstBusiness] = useState("");
  const [fundingInterest, setFundingInterest] = useState("");
  const [teamStatus, setTeamStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scroll to top when submission succeeds so user sees the confirmation, not the footer
  useEffect(() => {
    if (isSubmitted) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [isSubmitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
          stage: "waitlist",
          challenges: company ? [company] : [],
          qualifying: {
            startupStage: startupStage || null,
            firstBusiness: firstBusiness || null,
            fundingInterest: fundingInterest || null,
            teamStatus: teamStatus || null,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join waitlist");
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: Sparkles,
      title: "Early Access",
      description: "Be first to experience Sahara's AI-powered decision engine"
    },
    {
      icon: Users,
      title: "Founder Community",
      description: "Join a network of 10,000+ founders coached by Fred Cary"
    },
    {
      icon: TrendingUp,
      title: "Launch Pricing",
      description: "Lock in exclusive early adopter rates"
    },
    {
      icon: Shield,
      title: "Priority Support",
      description: "Get direct access to our founding team"
    }
  ];

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
        {/* Header */}
        <header className="w-full py-6 px-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <Image
                src="/sahara-logo.svg"
                alt="Sahara"
                width={120}
                height={30}
                className="h-8 w-auto"
              />
            </Link>
            <Button asChild variant="ghost" className="text-[#ff6a1a] hover:bg-[#ff6a1a]/10">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-5xl">
            {!isSubmitted ? (
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                {/* Left side - Info */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <motion.span
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="inline-block text-sm font-semibold text-[#ff6a1a] bg-[#ff6a1a]/10 px-4 py-1.5 rounded-full border border-[#ff6a1a]/20"
                    >
                      Coming Soon
                    </motion.span>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white">
                      Join the{" "}
                      <span className="text-[#ff6a1a]">Sahara</span>{" "}
                      Waitlist
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-lg">
                      Be among the first founders to access the AI-powered operating system
                      built by Fred Cary. Think Clearer. Raise Smarter. Scale Faster.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {benefits.map((benefit, index) => (
                      <motion.div
                        key={benefit.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#ff6a1a]/10 flex items-center justify-center flex-shrink-0">
                          <benefit.icon className="w-5 h-5 text-[#ff6a1a]" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{benefit.title}</h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{benefit.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Right side - Form */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-xl">
                    <div className="space-y-6">
                      <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reserve Your Spot</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Limited early access slots available
                        </p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all"
                          />
                        </div>

                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="email"
                            placeholder="Your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all"
                          />
                        </div>

                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Company name (optional)"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all"
                          />
                        </div>

                        {/* Qualifying Questions */}
                        <div className="space-y-3 pt-2">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Help us learn about you (optional)
                          </p>

                          <div className="space-y-1">
                            <label className="text-sm text-gray-700 dark:text-gray-300">What stage is your startup?</label>
                            <div className="flex flex-wrap gap-2">
                              {stageOptions.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setStartupStage(startupStage === opt.value ? "" : opt.value)}
                                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                                    startupStage === opt.value
                                      ? "bg-[#ff6a1a] text-white border-[#ff6a1a]"
                                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#ff6a1a]/50"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm text-gray-700 dark:text-gray-300">Is this your first business?</label>
                            <div className="flex flex-wrap gap-2">
                              {[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }].map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setFirstBusiness(firstBusiness === opt.value ? "" : opt.value)}
                                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                                    firstBusiness === opt.value
                                      ? "bg-[#ff6a1a] text-white border-[#ff6a1a]"
                                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#ff6a1a]/50"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm text-gray-700 dark:text-gray-300">Are you looking for funding?</label>
                            <div className="flex flex-wrap gap-2">
                              {fundingOptions.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setFundingInterest(fundingInterest === opt.value ? "" : opt.value)}
                                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                                    fundingInterest === opt.value
                                      ? "bg-[#ff6a1a] text-white border-[#ff6a1a]"
                                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#ff6a1a]/50"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm text-gray-700 dark:text-gray-300">Do you have a co-founder or team?</label>
                            <div className="flex flex-wrap gap-2">
                              {teamOptions.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setTeamStatus(teamStatus === opt.value ? "" : opt.value)}
                                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                                    teamStatus === opt.value
                                      ? "bg-[#ff6a1a] text-white border-[#ff6a1a]"
                                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#ff6a1a]/50"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
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
                          type="submit"
                          size="lg"
                          disabled={isSubmitting}
                          className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40 transition-all"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Joining waitlist...
                            </>
                          ) : (
                            <>
                              Join the Waitlist
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </form>

                      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                        No spam, ever. We'll only email you about Sahara updates.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            ) : (
              /* Success state */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-lg mx-auto text-center space-y-6"
              >
                <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    You're on the list!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Thanks for joining the Sahara waitlist, {name.split(" ")[0]}! We'll notify you
                    at <span className="font-medium text-[#ff6a1a]">{email}</span> when we're ready to launch.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button asChild variant="outline" className="border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/10">
                    <Link href="/">
                      Back to Home
                    </Link>
                  </Button>
                  <Button asChild className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
                    <Link href="/links">
                      <Rocket className="w-4 h-4 mr-2" />
                      Explore Links
                    </Link>
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
