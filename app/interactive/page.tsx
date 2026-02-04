"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Draggable } from "gsap/Draggable";
import { useGSAP } from "@gsap/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Zap,
  TrendingUp,
  Bot,
  ArrowRight,
  ArrowDown,
  Sparkles,
  CheckCircle2,
  Target,
  Users,
  DollarSign,
  Mail,
  Briefcase,
  BarChart3,
  Rocket,
  Star,
  Info,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/footer";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, Draggable, useGSAP);
}

// Product data
const products = [
  {
    id: "reality",
    name: "Reality Lens",
    tagline: "Analyze Your Idea",
    description: "Get brutally honest feedback on your startup idea in 60 seconds",
    icon: Zap,
    color: "#ff6a1a",
    gradient: "from-orange-500 to-orange-600",
    price: "Free",
    features: ["4-Factor Analysis", "Red Flag Detection", "Action Priorities"],
    href: "/demo/reality-lens",
  },
  {
    id: "investor",
    name: "Investor Lens",
    tagline: "Prepare for Funding",
    description: "Know exactly when you're ready to pitch VCs",
    icon: TrendingUp,
    color: "#f97316",
    gradient: "from-orange-600 to-amber-500",
    price: "$99/mo",
    features: ["8-Dimension Score", "VC Checklist", "Progress Tracking"],
    href: "/demo/investor-lens",
  },
  {
    id: "team",
    name: "Virtual Team",
    tagline: "Scale with AI",
    description: "4 AI agents that handle your ops while you build",
    icon: Bot,
    color: "#ea580c",
    gradient: "from-amber-500 to-orange-600",
    price: "$249/mo",
    features: ["4 AI Agents", "32h/week Saved", "Full Automation"],
    href: "/demo/virtual-team",
  },
];

const stats = [
  { value: 2400, suffix: "+", label: "Startups Analyzed" },
  { value: 32, suffix: "h", label: "Saved Per Week" },
  { value: 87, suffix: "%", label: "Close Rate" },
  { value: 3.2, suffix: "x", label: "Faster Fundraising", decimals: 1 },
];

export default function InteractivePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeProduct, setActiveProduct] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [infoPanelProduct, setInfoPanelProduct] = useState<typeof products[0] | null>(null);
  const [dropZoneActive, setDropZoneActive] = useState<"left" | "right" | null>(null);

  // Mouse tracking for background effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // GSAP Animations
  useGSAP(
    () => {
      // Hero text animation
      const heroTitle = heroRef.current?.querySelector(".hero-title");
      if (heroTitle) {
        const text = heroTitle.textContent || "";
        heroTitle.textContent = "";
        text.split("").forEach((char, i) => {
          const span = document.createElement("span");
          span.textContent = char === " " ? "\u00A0" : char;
          span.className = "inline-block opacity-0";
          heroTitle.appendChild(span);
        });

        gsap.to(heroTitle.querySelectorAll("span"), {
          opacity: 1,
          y: 0,
          rotationX: 0,
          stagger: 0.03,
          duration: 0.8,
          ease: "back.out(1.7)",
          delay: 0.3,
        });
      }

      // Floating particles animation
      gsap.to(".particle", {
        y: "random(-20, 20)",
        x: "random(-20, 20)",
        rotation: "random(-15, 15)",
        duration: "random(2, 4)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: {
          each: 0.2,
          from: "random",
        },
      });

      // Scroll indicator bounce
      gsap.to(".scroll-indicator", {
        y: 10,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
      });

      // Timeline horizontal scroll section
      if (timelineRef.current) {
        const timeline = timelineRef.current;
        const timelineItems = timeline.querySelectorAll(".timeline-item");

        gsap.to(timelineItems, {
          xPercent: -100 * (timelineItems.length - 1),
          ease: "none",
          scrollTrigger: {
            trigger: timeline,
            start: "top top",
            end: () => "+=" + timeline.offsetWidth,
            scrub: 1,
            pin: true,
            anticipatePin: 1,
          },
        });

        // Progress bar
        gsap.to(".timeline-progress", {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: timeline,
            start: "top top",
            end: () => "+=" + timeline.offsetWidth,
            scrub: 1,
          },
        });
      }

      // Stats counter animation
      if (statsRef.current) {
        const statNumbers = statsRef.current.querySelectorAll(".stat-number");
        statNumbers.forEach((num) => {
          const target = parseFloat(num.getAttribute("data-target") || "0");
          const decimals = parseInt(num.getAttribute("data-decimals") || "0");
          const suffix = num.getAttribute("data-suffix") || "";

          ScrollTrigger.create({
            trigger: num,
            start: "top 80%",
            onEnter: () => {
              gsap.to(num, {
                textContent: target,
                duration: 2,
                ease: "power2.out",
                snap: { textContent: decimals > 0 ? 0.1 : 1 },
                onUpdate: function () {
                  const val = parseFloat(
                    (this.targets()[0] as HTMLElement).textContent || "0"
                  );
                  (this.targets()[0] as HTMLElement).textContent =
                    val.toFixed(decimals) + suffix;
                },
              });
            },
            once: true,
          });
        });

        // Confetti trigger on stats complete
        ScrollTrigger.create({
          trigger: statsRef.current,
          start: "top 50%",
          onEnter: () => {
            setTimeout(() => setConfetti(true), 1500);
            setTimeout(() => setConfetti(false), 3500);
          },
          once: true,
        });
      }

      // Magnetic CTA button
      const ctaButton = ctaRef.current?.querySelector(".magnetic-btn");
      if (ctaButton) {
        const btn = ctaButton as HTMLElement;
        btn.addEventListener("mousemove", (e: MouseEvent) => {
          const rect = btn.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;

          gsap.to(btn, {
            x: x * 0.4,
            y: y * 0.4,
            duration: 0.3,
            ease: "power2.out",
          });
        });

        btn.addEventListener("mouseleave", () => {
          gsap.to(btn, {
            x: 0,
            y: 0,
            duration: 0.5,
            ease: "elastic.out(1, 0.3)",
          });
        });
      }
    },
    { scope: containerRef }
  );

  // Initialize draggable cards with dual-action
  useEffect(() => {
    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll(".draggable-card");

      cards.forEach((card) => {
        Draggable.create(card, {
          type: "x,y",
          bounds: cardsRef.current,
          inertia: true,
          onDragStart: function () {
            gsap.to(this.target, {
              scale: 1.05,
              boxShadow: "0 25px 50px -12px rgba(255, 106, 26, 0.4)",
              duration: 0.2,
            });
          },
          onDrag: function () {
            const rect = (this.target as HTMLElement).getBoundingClientRect();
            const containerRect = cardsRef.current!.getBoundingClientRect();

            // Check proximity to drop zones
            if (rect.left < containerRect.left + 180) {
              setDropZoneActive("left");
            } else if (rect.right > containerRect.right - 180) {
              setDropZoneActive("right");
            } else {
              setDropZoneActive(null);
            }
          },
          onDragEnd: function () {
            const productId = (this.target as HTMLElement).getAttribute("data-product-id");
            const product = products.find(p => p.id === productId);
            const currentDropZone = dropZoneActive;

            if (currentDropZone === "left" && product) {
              // Navigate to demo with exit animation
              gsap.to(this.target, {
                scale: 0,
                opacity: 0,
                duration: 0.3,
                onComplete: () => {
                  window.location.href = product.href;
                },
              });
            } else if (currentDropZone === "right" && product) {
              // Show info panel
              setInfoPanelProduct(product);
              gsap.to(this.target, {
                scale: 1,
                x: 0,
                y: 0,
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                duration: 0.5,
                ease: "elastic.out(1, 0.5)",
              });
            } else {
              // Snap back to origin
              gsap.to(this.target, {
                scale: 1,
                x: 0,
                y: 0,
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                duration: 0.5,
                ease: "elastic.out(1, 0.5)",
              });
            }
            setDropZoneActive(null);
          },
        });
      });
    }
  }, [dropZoneActive]);

  return (
    <div ref={containerRef} className="min-h-screen bg-white dark:bg-gray-950 overflow-hidden">
      {/* Animated background gradient following mouse */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-500 opacity-30"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 106, 26, 0.15), transparent 40%)`,
        }}
      />

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle absolute w-2 h-2 rounded-full bg-orange-500/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* SECTION 1: Hero */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20"
      >
        {/* Animated badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 text-sm font-medium text-orange-500">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Interactive Product Demo
          </span>
        </motion.div>

        {/* Hero title with kinetic typography */}
        <h1 className="hero-title text-5xl md:text-7xl lg:text-8xl font-bold text-center text-gray-900 dark:text-white mb-6">
          Your Startup&apos;s Decision Engine
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 text-center max-w-3xl mb-12"
        >
          Think Clearer. Raise Smarter. Scale Faster.
          <br />
          <span className="text-orange-500 font-medium">Scroll to explore the journey.</span>
        </motion.p>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="scroll-indicator absolute bottom-12 flex flex-col items-center gap-2"
        >
          <span className="text-sm text-gray-500">Scroll to explore</span>
          <ArrowDown className="w-6 h-6 text-orange-500" />
        </motion.div>
      </section>

      {/* SECTION 2: Product Journey Timeline (Horizontal Scroll) */}
      <section
        ref={timelineRef}
        className="relative h-screen flex items-center overflow-hidden bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900"
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800">
          <div className="timeline-progress h-full bg-gradient-to-r from-orange-500 to-amber-500 origin-left scale-x-0" />
        </div>

        <div className="flex">
          {products.map((product, index) => {
            const Icon = product.icon;
            return (
              <div
                key={product.id}
                className="timeline-item w-screen h-screen flex-shrink-0 flex items-center justify-center px-8"
              >
                <div className="max-w-4xl w-full">
                  <div className="flex flex-col md:flex-row items-center gap-12">
                    {/* Step indicator */}
                    <div className="flex-shrink-0">
                      <div
                        className="w-32 h-32 rounded-3xl flex items-center justify-center shadow-2xl"
                        style={{
                          background: `linear-gradient(135deg, ${product.color}, ${product.color}dd)`,
                        }}
                      >
                        <Icon className="w-16 h-16 text-white" />
                      </div>
                      <div className="text-center mt-4">
                        <span className="text-6xl font-bold text-orange-500/20">
                          0{index + 1}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 text-center md:text-left">
                      <span className="text-orange-500 font-medium text-lg">
                        {product.tagline}
                      </span>
                      <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mt-2 mb-4">
                        {product.name}
                      </h2>
                      <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
                        {product.description}
                      </p>

                      <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-8">
                        {product.features.map((feature) => (
                          <span
                            key={feature}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-500 text-sm font-medium"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {feature}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 justify-center md:justify-start">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                          {product.price}
                        </span>
                        <Button
                          asChild
                          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25"
                        >
                          <Link href={product.href}>
                            Try {product.name} <ArrowRight className="ml-2 w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: Draggable Feature Cards */}
      <section className="relative py-24 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-500 text-sm font-medium mb-4"
            >
              <Sparkles className="w-4 h-4" />
              Interactive Demo
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4"
            >
              Drag to Explore
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg sm:text-xl text-gray-600 dark:text-gray-400"
            >
              <span className="hidden lg:inline">Drag left to try a demo, drag right for details, or click to explore</span>
              <span className="lg:hidden">Tap any card to explore the demo</span>
            </motion.p>
          </div>

          <div
            ref={cardsRef}
            className="relative min-h-[500px] flex flex-wrap items-center justify-center gap-4 sm:gap-8 mx-auto max-w-5xl"
          >
            {/* Drop Zones - Hidden on mobile, shown on desktop */}
            {/* Left Drop Zone - Navigate to Demo */}
            <div
              className={`hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 w-28 xl:w-32 h-64 xl:h-72 rounded-2xl border-2 border-dashed transition-all duration-300 z-10
                ${dropZoneActive === "left"
                  ? "border-green-500 bg-green-500/20 scale-110 shadow-lg shadow-green-500/20"
                  : "border-gray-300 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50"}`}
            >
              <div className="flex flex-col items-center justify-center h-full text-center p-3 xl:p-4">
                <div className={`p-2 xl:p-3 rounded-full mb-2 xl:mb-3 transition-colors ${dropZoneActive === "left" ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`}>
                  <Rocket className={`w-5 h-5 xl:w-6 xl:h-6 ${dropZoneActive === "left" ? "text-white" : "text-gray-500"}`} />
                </div>
                <span className={`text-xs xl:text-sm font-medium ${dropZoneActive === "left" ? "text-green-600 dark:text-green-400" : "text-gray-500"}`}>
                  Drop to Try
                </span>
              </div>
            </div>

            {/* Right Drop Zone - Show Details */}
            <div
              className={`hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 w-28 xl:w-32 h-64 xl:h-72 rounded-2xl border-2 border-dashed transition-all duration-300 z-10
                ${dropZoneActive === "right"
                  ? "border-blue-500 bg-blue-500/20 scale-110 shadow-lg shadow-blue-500/20"
                  : "border-gray-300 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50"}`}
            >
              <div className="flex flex-col items-center justify-center h-full text-center p-3 xl:p-4">
                <div className={`p-2 xl:p-3 rounded-full mb-2 xl:mb-3 transition-colors ${dropZoneActive === "right" ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"}`}>
                  <Info className={`w-5 h-5 xl:w-6 xl:h-6 ${dropZoneActive === "right" ? "text-white" : "text-gray-500"}`} />
                </div>
                <span className={`text-xs xl:text-sm font-medium ${dropZoneActive === "right" ? "text-blue-600 dark:text-blue-400" : "text-gray-500"}`}>
                  Details
                </span>
              </div>
            </div>

            {products.map((product, index) => {
              const Icon = product.icon;
              return (
                <motion.div
                  key={product.id}
                  data-product-id={product.id}
                  initial={{ opacity: 0, y: 50, rotate: -5 + index * 5 }}
                  whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15, type: "spring" }}
                  className="draggable-card cursor-grab active:cursor-grabbing"
                  onMouseEnter={() => setActiveProduct(product.id)}
                  onMouseLeave={() => setActiveProduct(null)}
                  onClick={() => window.location.href = product.href}
                >
                  <div
                    className={`
                      relative w-full sm:w-72 lg:w-80 p-6 sm:p-8 rounded-3xl bg-white dark:bg-gray-800
                      border-2 border-transparent
                      shadow-xl hover:shadow-2xl
                      transition-all duration-300
                      ${activeProduct === product.id ? "border-orange-500 scale-105" : ""}
                    `}
                  >
                    {/* Glow effect */}
                    <div
                      className={`
                        absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300
                        ${activeProduct === product.id ? "opacity-100" : ""}
                      `}
                      style={{
                        background: `radial-gradient(circle at 50% 0%, ${product.color}20, transparent 70%)`,
                      }}
                    />

                    <div className="relative">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                        style={{
                          background: `linear-gradient(135deg, ${product.color}, ${product.color}cc)`,
                        }}
                      >
                        <Icon className="w-8 h-8 text-white" />
                      </div>

                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {product.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {product.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-xl sm:text-2xl font-bold text-orange-500">
                          {product.price}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500">
                          <span className="hidden lg:inline">← Demo | Details →</span>
                          <span className="lg:hidden">Tap to explore</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4: Stats with Confetti */}
      <section
        ref={statsRef}
        className="relative py-24 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 overflow-hidden"
      >
        {/* Confetti */}
        <AnimatePresence>
          {confetti && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(50)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    opacity: 1,
                    x: "50vw",
                    y: "50vh",
                    scale: 0,
                  }}
                  animate={{
                    opacity: [1, 1, 0],
                    x: `${Math.random() * 100}vw`,
                    y: `${Math.random() * 100}vh`,
                    scale: [0, 1, 0.5],
                    rotate: Math.random() * 720,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 2,
                    delay: Math.random() * 0.5,
                  }}
                  className="absolute w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor: ["#ff6a1a", "#f97316", "#fbbf24", "#22c55e", "#3b82f6"][
                      Math.floor(Math.random() * 5)
                    ],
                  }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4"
            >
              The Numbers Don&apos;t Lie
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600 dark:text-gray-400"
            >
              Real results from real founders
            </motion.p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div
                  className="stat-number text-5xl md:text-6xl font-bold text-orange-500 mb-2"
                  data-target={stat.value}
                  data-suffix={stat.suffix}
                  data-decimals={stat.decimals || 0}
                >
                  0{stat.suffix}
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: Magnetic CTA */}
      <section
        ref={ctaRef}
        className="relative py-32 px-4 bg-gradient-to-br from-orange-500 to-orange-600 overflow-hidden"
      >
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="container mx-auto max-w-4xl text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Ready to Think Clearer?
            </h2>
            <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
              Join 2,400+ founders who&apos;ve already transformed their decision-making.
              Start free, upgrade when you&apos;re ready.
            </p>

            <div className="inline-block">
              <Button
                asChild
                size="lg"
                className="magnetic-btn bg-white hover:bg-gray-100 text-orange-500 text-xl px-12 py-8 rounded-2xl shadow-2xl hover:shadow-3xl transition-all"
              >
                <Link href="/demo/reality-lens">
                  Get Started Free
                  <Rocket className="ml-3 w-6 h-6" />
                </Link>
              </Button>
            </div>

            <p className="mt-6 text-white/60 text-sm">
              No credit card required. Start analyzing in 60 seconds.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Info Panel Slide-in */}
      <AnimatePresence>
        {infoPanelProduct && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setInfoPanelProduct(null)}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 sm:p-8">
                <button
                  onClick={() => setInfoPanelProduct(null)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${infoPanelProduct.color}, ${infoPanelProduct.color}cc)`,
                    }}
                  >
                    <infoPanelProduct.icon className="w-10 h-10 text-white" />
                  </div>

                  <span className="text-orange-500 font-medium text-sm">
                    {infoPanelProduct.tagline}
                  </span>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1 mb-3">
                    {infoPanelProduct.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">
                    {infoPanelProduct.description}
                  </p>

                  <div className="space-y-4 mb-8">
                    <h3 className="font-semibold text-gray-900 dark:text-white">What&apos;s Included</h3>
                    {infoPanelProduct.features.map((feature, i) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 mb-8">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Starting at</span>
                    <div className="text-4xl font-bold text-orange-500">{infoPanelProduct.price}</div>
                    {infoPanelProduct.price !== "Free" && (
                      <span className="text-sm text-gray-500">per month</span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Button
                      asChild
                      size="lg"
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25"
                    >
                      <Link href={infoPanelProduct.href}>
                        Try {infoPanelProduct.name}
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="w-full border-gray-200 dark:border-gray-700"
                    >
                      <Link href="/pricing">View All Pricing</Link>
                    </Button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
