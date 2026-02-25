"use client";

import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  type: "star" | "spark" | "orb";
}

/**
 * NightModeParticles - Floating particles that only appear in dark mode
 * Creates a magical night sky effect with stars, sparks, and glowing orbs
 */
export default function NightModeParticles() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);

      // Generate random particles
      const generatedParticles: Particle[] = [];

      // Stars - small twinkling points
      for (let i = 0; i < 30; i++) {
        generatedParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 3 + 1,
          duration: Math.random() * 3 + 2,
          delay: Math.random() * 2,
          opacity: Math.random() * 0.5 + 0.3,
          type: "star",
        });
      }

      // Sparks - rising orange sparks
      for (let i = 30; i < 45; i++) {
        generatedParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 4 + 2,
          duration: Math.random() * 4 + 3,
          delay: Math.random() * 3,
          opacity: Math.random() * 0.6 + 0.2,
          type: "spark",
        });
      }

      // Orbs - larger glowing circles
      for (let i = 45; i < 55; i++) {
        generatedParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 20 + 10,
          duration: Math.random() * 8 + 6,
          delay: Math.random() * 4,
          opacity: Math.random() * 0.15 + 0.05,
          type: "orb",
        });
      }

      setParticles(generatedParticles);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Don't render on server or in light mode
  if (!mounted || resolvedTheme !== "dark") {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((particle) => {
        if (particle.type === "star") {
          return (
            <motion.div
              key={particle.id}
              className="absolute rounded-full bg-white"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: particle.size,
                height: particle.size,
              }}
              animate={{
                opacity: [particle.opacity * 0.3, particle.opacity, particle.opacity * 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay,
                ease: "easeInOut",
              }}
            />
          );
        }

        if (particle.type === "spark") {
          return (
            <motion.div
              key={particle.id}
              className="absolute rounded-full bg-[#ff6a1a]"
              style={{
                left: `${particle.x}%`,
                width: particle.size,
                height: particle.size,
              }}
              animate={{
                y: [0, -100, -200],
                opacity: [0, particle.opacity, 0],
                scale: [0.5, 1, 0.2],
              }}
              initial={{
                y: 0,
                bottom: `${particle.y * 0.3}%`,
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay,
                ease: "easeOut",
              }}
            />
          );
        }

        // Orbs - larger glowing circles
        return (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              background: `radial-gradient(circle, rgba(255, 106, 26, ${particle.opacity}) 0%, transparent 70%)`,
            }}
            animate={{
              x: [0, 30, -20, 0],
              y: [0, -30, 20, 0],
              scale: [1, 1.3, 0.9, 1],
              opacity: [particle.opacity, particle.opacity * 1.5, particle.opacity * 0.5, particle.opacity],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        );
      })}

      {/* Shooting stars - occasional streaks across the sky */}
      <motion.div
        className="absolute w-32 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"
        style={{
          top: "15%",
          left: "-10%",
          transform: "rotate(-15deg)",
        }}
        animate={{
          x: ["0%", "120vw"],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatDelay: 8,
          ease: "easeOut",
        }}
      />
      <motion.div
        className="absolute w-24 h-0.5 bg-gradient-to-r from-transparent via-[#ff6a1a] to-transparent rounded-full"
        style={{
          top: "35%",
          left: "-10%",
          transform: "rotate(-20deg)",
        }}
        animate={{
          x: ["0%", "100vw"],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          repeatDelay: 12,
          delay: 4,
          ease: "easeOut",
        }}
      />
      <motion.div
        className="absolute w-20 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full"
        style={{
          top: "55%",
          left: "-10%",
          transform: "rotate(-10deg)",
        }}
        animate={{
          x: ["0%", "110vw"],
          opacity: [0, 0.8, 0],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          repeatDelay: 15,
          delay: 8,
          ease: "easeOut",
        }}
      />

      {/* Pulsing glow rings */}
      <motion.div
        className="absolute left-[20%] top-[30%] w-40 h-40 rounded-full border border-[#ff6a1a]/20"
        animate={{
          scale: [1, 2, 3],
          opacity: [0.3, 0.1, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />
      <motion.div
        className="absolute right-[25%] top-[50%] w-32 h-32 rounded-full border border-orange-400/20"
        animate={{
          scale: [1, 2.5, 4],
          opacity: [0.25, 0.08, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          delay: 2,
          ease: "easeOut",
        }}
      />
      <motion.div
        className="absolute left-[60%] top-[20%] w-24 h-24 rounded-full border border-amber-500/20"
        animate={{
          scale: [1, 2, 3.5],
          opacity: [0.2, 0.05, 0],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          delay: 1,
          ease: "easeOut",
        }}
      />
    </div>
  );
}
