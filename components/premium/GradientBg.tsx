"use client";

import { motion } from "framer-motion";

interface GradientBgProps {
  className?: string;
  variant?: "mesh" | "aurora" | "spotlight" | "radial";
}

export function GradientBg({ className = "", variant = "mesh" }: GradientBgProps) {
  if (variant === "mesh") {
    return <MeshGradient className={className} />;
  }
  if (variant === "aurora") {
    return <AuroraGradient className={className} />;
  }
  if (variant === "spotlight") {
    return <SpotlightGradient className={className} />;
  }
  return <RadialGradient className={className} />;
}

function MeshGradient({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Animated blobs */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-primary/30 to-blue-500/20 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          x: [0, -100, 0],
          y: [0, 100, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-tl from-purple-500/30 to-pink-500/20 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          x: [0, 50, 0],
          y: [0, -80, 0],
          scale: [1, 0.9, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 rounded-full blur-3xl"
      />
    </div>
  );
}

function AuroraGradient({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <motion.div
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-0 opacity-50"
        style={{
          background: `
            linear-gradient(
              45deg,
              hsl(var(--primary) / 0.2) 0%,
              transparent 40%,
              transparent 60%,
              hsl(var(--primary) / 0.2) 100%
            )
          `,
          backgroundSize: "400% 400%",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
    </div>
  );
}

function SpotlightGradient({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <motion.div
        animate={{
          x: ["-25%", "25%", "-25%"],
          y: ["-25%", "25%", "-25%"],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-0 left-1/4 w-1/2 h-full"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
        }}
      />
    </div>
  );
}

function RadialGradient({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 80% at 50% -20%, hsl(var(--primary) / 0.15), transparent),
            radial-gradient(ellipse 60% 60% at 100% 100%, hsl(var(--primary) / 0.1), transparent)
          `,
        }}
      />
    </div>
  );
}

// Floating elements for decoration
export function FloatingOrbs({ variant = "default" }: { variant?: "default" | "chat" }) {
  // Chat variant uses brand colors with higher visibility
  const chatOrbs = [
    { size: 350, x: "5%", y: "15%", color: "orange", delay: 0 },
    { size: 280, x: "75%", y: "55%", color: "orangeLight", delay: 1.5 },
    { size: 200, x: "55%", y: "5%", color: "amber", delay: 3 },
    { size: 150, x: "15%", y: "70%", color: "orangeDark", delay: 0.5 },
    { size: 120, x: "85%", y: "20%", color: "peach", delay: 2 },
  ];

  const defaultOrbs = [
    { size: 300, x: "10%", y: "20%", color: "primary", delay: 0 },
    { size: 200, x: "80%", y: "60%", color: "purple", delay: 2 },
    { size: 150, x: "60%", y: "10%", color: "blue", delay: 4 },
    { size: 100, x: "20%", y: "80%", color: "cyan", delay: 1 },
  ];

  const orbs = variant === "chat" ? chatOrbs : defaultOrbs;

  const colors = {
    primary: "bg-primary/10",
    purple: "bg-purple-500/10",
    blue: "bg-blue-500/10",
    cyan: "bg-cyan-500/10",
    // Chat-optimized orange theme colors with higher visibility
    orange: "bg-[#ff6a1a]/20",
    orangeLight: "bg-orange-400/18",
    orangeDark: "bg-orange-600/15",
    amber: "bg-amber-500/15",
    peach: "bg-orange-300/12",
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -40, 0],
            x: [0, 25, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 10 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: orb.delay,
          }}
          className={`absolute rounded-full ${variant === "chat" ? "blur-[80px]" : "blur-3xl"} ${colors[orb.color as keyof typeof colors]}`}
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
          }}
        />
      ))}
    </div>
  );
}

// Grid pattern background
export function GridPattern({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: "radial-gradient(circle at 50% 50%, hsl(var(--primary)), transparent 70%)",
        }}
      />
    </div>
  );
}
