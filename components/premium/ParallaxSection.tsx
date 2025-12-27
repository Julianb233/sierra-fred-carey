"use client";

import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ReactNode, useRef } from "react";

interface ParallaxSectionProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  direction?: "up" | "down";
}

// Basic parallax wrapper - moves content at different speed than scroll
export function Parallax({
  children,
  className = "",
  speed = 0.5,
  direction = "up",
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    direction === "up" ? [100 * speed, -100 * speed] : [-100 * speed, 100 * speed]
  );

  const smoothY = useSpring(y, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <motion.div ref={ref} style={{ y: smoothY }} className={className}>
      {children}
    </motion.div>
  );
}

// Section with parallax background layers
export function ParallaxBackground({
  children,
  className = "",
  layers = 3,
}: {
  children: ReactNode;
  className?: string;
  layers?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const layerSpeeds = [0.2, 0.4, 0.6, 0.8, 1];

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {/* Background layers */}
      {Array.from({ length: layers }).map((_, i) => {
        const y = useTransform(scrollYProgress, [0, 1], [50 * layerSpeeds[i], -50 * layerSpeeds[i]]);
        return (
          <motion.div
            key={i}
            style={{ y }}
            className={`absolute inset-0 pointer-events-none opacity-${20 + i * 10}`}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at ${30 + i * 20}% ${20 + i * 30}%, hsl(var(--primary) / ${0.05 + i * 0.02}), transparent ${30 + i * 10}%)`,
              }}
            />
          </motion.div>
        );
      })}
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Horizontal scroll section
export function HorizontalScroll({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-75%"]);

  return (
    <div ref={containerRef} className={`relative h-[300vh] ${className}`}>
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <motion.div style={{ x }} className="flex gap-8">
          {children}
        </motion.div>
      </div>
    </div>
  );
}

// Scale on scroll - grows as it comes into view
export function ScaleOnScroll({
  children,
  className = "",
  scaleFrom = 0.8,
  scaleTo = 1,
}: {
  children: ReactNode;
  className?: string;
  scaleFrom?: number;
  scaleTo?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [scaleFrom, scaleTo]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.5, 1]);

  return (
    <motion.div ref={ref} style={{ scale, opacity }} className={className}>
      {children}
    </motion.div>
  );
}

// Rotate on scroll
export function RotateOnScroll({
  children,
  className = "",
  rotateFrom = -10,
  rotateTo = 0,
}: {
  children: ReactNode;
  className?: string;
  rotateFrom?: number;
  rotateTo?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const rotate = useTransform(scrollYProgress, [0, 1], [rotateFrom, rotateTo]);
  const y = useTransform(scrollYProgress, [0, 1], [50, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 1], [0, 1, 1]);

  return (
    <motion.div ref={ref} style={{ rotate, y, opacity }} className={className}>
      {children}
    </motion.div>
  );
}

// Reveal section - slides in from side
export function SlideReveal({
  children,
  className = "",
  direction = "left",
}: {
  children: ReactNode;
  className?: string;
  direction?: "left" | "right" | "up" | "down";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const xFrom = direction === "left" ? -100 : direction === "right" ? 100 : 0;
  const yFrom = direction === "up" ? 100 : direction === "down" ? -100 : 0;

  const x = useTransform(scrollYProgress, [0, 1], [xFrom, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [yFrom, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.5, 1]);

  return (
    <motion.div ref={ref} style={{ x, y, opacity }} className={className}>
      {children}
    </motion.div>
  );
}

// Sticky section that pins while scrolling
export function StickySection({
  children,
  className = "",
  height = "200vh",
}: {
  children: ReactNode;
  className?: string;
  height?: string;
}) {
  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// Parallax image with overlay
export function ParallaxImage({
  src,
  alt,
  className = "",
  overlayClassName = "",
  speed = 0.3,
}: {
  src: string;
  alt: string;
  className?: string;
  overlayClassName?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [-100 * speed, 100 * speed]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        style={{ y }}
        className="absolute inset-0 w-full h-full object-cover scale-110"
      />
      <div className={`absolute inset-0 ${overlayClassName}`} />
    </div>
  );
}

// Progress-based opacity reveal
export function FadeInSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start 0.3"],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [60, 0]);

  return (
    <motion.div ref={ref} style={{ opacity, y }} className={className}>
      {children}
    </motion.div>
  );
}

// Multi-layer parallax hero
export function ParallaxHero({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div ref={ref} className={`relative min-h-screen overflow-hidden ${className}`}>
      {/* Background layer - fastest */}
      <motion.div style={{ y: y1 }} className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
      </motion.div>

      {/* Middle layer */}
      <motion.div style={{ y: y2 }} className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </motion.div>

      {/* Content layer - slowest */}
      <motion.div style={{ y: y3, opacity }} className="relative z-10">
        {children}
      </motion.div>
    </div>
  );
}
