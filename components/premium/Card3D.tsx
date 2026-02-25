"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ReactNode, useRef, useCallback, useEffect, useState } from "react";

interface Card3DProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  rotationIntensity?: number;
  glareEnabled?: boolean;
}

// Throttle helper for performance
function useThrottledCallback(
  callback: (mouseX: number, mouseY: number, width: number, height: number) => void,
  delay: number
) {
  const lastCall = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgsRef = useRef<[number, number, number, number] | null>(null);

  return useCallback(
    (mouseX: number, mouseY: number, width: number, height: number) => {
      const now = Date.now();
      lastArgsRef.current = [mouseX, mouseY, width, height];

      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        callback(mouseX, mouseY, width, height);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastCall.current = Date.now();
          if (lastArgsRef.current) {
            callback(...lastArgsRef.current);
          }
          timeoutRef.current = null;
        }, delay - (now - lastCall.current));
      }
    },
    [callback, delay]
  );
}

// Hook to detect reduced motion preference
function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    // Initialize from media query via callback to avoid synchronous setState in effect
    const timer = setTimeout(() => setPrefersReducedMotion(mediaQuery.matches), 0);
    mediaQuery.addEventListener("change", handler);
    return () => {
      clearTimeout(timer);
      mediaQuery.removeEventListener("change", handler);
    };
  }, []);

  return prefersReducedMotion;
}

export function Card3D({
  children,
  className = "",
  containerClassName = "",
  rotationIntensity = 10,
  glareEnabled = true,
}: Card3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [`${rotationIntensity}deg`, `-${rotationIntensity}deg`]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [`-${rotationIntensity}deg`, `${rotationIntensity}deg`]);

  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);

  // Throttled mouse move handler - updates max 60fps (16ms)
  const updatePosition = useCallback((mouseX: number, mouseY: number, width: number, height: number) => {
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  }, [x, y]);

  const throttledUpdate = useThrottledCallback(updatePosition, 16);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || prefersReducedMotion) return;
    const rect = ref.current.getBoundingClientRect();
    throttledUpdate(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
  }, [throttledUpdate, prefersReducedMotion]);

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <div className={`perspective-1000 ${containerClassName}`}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className={`relative ${className}`}
      >
        {children}
        {glareEnabled && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.15) 0%, transparent 50%)`,
            }}
          />
        )}
      </motion.div>
    </div>
  );
}

// Pre-styled 3D card with glassmorphism
export function GlassCard3D({
  children,
  className = "",
  glowColor = "primary",
}: {
  children: ReactNode;
  className?: string;
  glowColor?: "primary" | "blue" | "purple" | "green";
}) {
  const glowColors = {
    primary: "shadow-primary/20 hover:shadow-primary/40",
    blue: "shadow-blue-500/20 hover:shadow-blue-500/40",
    purple: "shadow-purple-500/20 hover:shadow-purple-500/40",
    green: "shadow-green-500/20 hover:shadow-green-500/40",
  };

  return (
    <Card3D
      className={`group rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50
        shadow-2xl ${glowColors[glowColor]} transition-shadow duration-500
        hover:border-primary/30 ${className}`}
      rotationIntensity={8}
    >
      <div className="relative z-10">{children}</div>
    </Card3D>
  );
}
