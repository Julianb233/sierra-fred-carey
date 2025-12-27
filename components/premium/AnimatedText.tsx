"use client";

import { motion, Variants, useInView } from "framer-motion";
import { ReactNode, useRef, useState, useEffect } from "react";

interface AnimatedTextProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

// Text that reveals character by character
export function TextReveal({
  text,
  className = "",
  delay = 0,
  staggerChildren = 0.03
}: {
  text: string;
  className?: string;
  delay?: number;
  staggerChildren?: number;
}) {
  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren,
        delayChildren: delay,
      },
    },
  };

  const child: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.span
      variants={container}
      initial="hidden"
      animate="visible"
      className={`inline-block ${className}`}
    >
      {text.split("").map((char, index) => (
        <motion.span key={index} variants={child} className="inline-block">
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.span>
  );
}

// Text that reveals word by word
export function WordReveal({
  text,
  className = "",
  delay = 0
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: delay,
      },
    },
  };

  const child: Variants = {
    hidden: { opacity: 0, y: 30, rotateX: -90 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.span
      variants={container}
      initial="hidden"
      animate="visible"
      className={`inline-block ${className}`}
    >
      {text.split(" ").map((word, index) => (
        <motion.span
          key={index}
          variants={child}
          className="inline-block mr-[0.25em]"
          style={{ perspective: "1000px" }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

// Gradient text with animation
export function GradientText({
  children,
  className = "",
  from = "from-primary",
  via = "via-purple-500",
  to = "to-pink-500",
  animate = true,
}: {
  children: ReactNode;
  className?: string;
  from?: string;
  via?: string;
  to?: string;
  animate?: boolean;
}) {
  return (
    <span
      className={`inline-block bg-gradient-to-r ${from} ${via} ${to} ${
        animate ? "bg-[length:200%_auto] animate-gradient" : ""
      } ${className}`}
      style={{
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      {children}
    </span>
  );
}

// Typing effect
export function TypeWriter({
  text,
  className = "",
  speed = 50,
  delay = 0,
}: {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
}) {
  return (
    <motion.span className={className}>
      {text.split("").map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: delay + index * (speed / 1000),
            duration: 0,
          }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}

// Fade up animation wrapper
export function FadeUp({
  children,
  className = "",
  delay = 0,
  duration = 0.6,
}: AnimatedTextProps & { duration?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Fade up on scroll
export function FadeUpOnScroll({
  children,
  className = "",
  delay = 0,
  duration = 0.6,
}: AnimatedTextProps & { duration?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale up animation
export function ScaleUp({
  children,
  className = "",
  delay = 0
}: AnimatedTextProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.16, 1, 0.3, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger children animation
export function StaggerContainer({
  children,
  className = "",
  staggerDelay = 0.1,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            type: "spring",
            damping: 20,
            stiffness: 100,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Highlight text with animated underline
export function HighlightText({
  children,
  className = "",
  color = "primary",
}: {
  children: ReactNode;
  className?: string;
  color?: "primary" | "blue" | "purple" | "green";
}) {
  const colors = {
    primary: "bg-primary/20",
    blue: "bg-blue-500/20",
    purple: "bg-purple-500/20",
    green: "bg-green-500/20",
  };

  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10">{children}</span>
      <motion.span
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        className={`absolute bottom-0 left-0 right-0 h-[30%] ${colors[color]} origin-left rounded-sm`}
      />
    </span>
  );
}

// Counter animation
export function CountUp({
  end,
  duration = 2,
  prefix = "",
  suffix = "",
  className = "",
}: {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      const durationMs = duration * 1000;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.floor(easeOut * end));
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(end);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [isInView, end, duration]);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      {prefix}{displayValue.toLocaleString()}{suffix}
    </motion.span>
  );
}
