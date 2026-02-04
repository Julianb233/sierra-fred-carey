"use client";

import { motion, useScroll, useSpring } from "framer-motion";

interface ScrollProgressProps {
  className?: string;
  color?: string;
  height?: number;
  position?: "top" | "bottom";
}

export function ScrollProgress({
  className = "",
  color = "bg-primary",
  height = 3,
  position = "top",
}: ScrollProgressProps) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className={`fixed ${position === "top" ? "top-0" : "bottom-0"} left-0 right-0 z-50 origin-left ${color} ${className}`}
      style={{ scaleX, height }}
    />
  );
}

// Circular progress indicator
export function CircularProgress({
  className = "",
  size = 60,
  strokeWidth = 4,
}: {
  className?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const { scrollYProgress } = useScroll();
  const pathLength = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  return (
    <div className={`fixed bottom-8 right-8 z-50 ${className}`}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/20"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-primary"
          strokeLinecap="round"
          style={{
            pathLength,
            strokeDasharray: circumference,
            strokeDashoffset: circumference,
          }}
        />
      </svg>
      <motion.div
        className="absolute inset-0 flex items-center justify-center text-xs font-medium"
        style={{ opacity: scrollYProgress }}
      >
        <motion.span>
          {/* Percentage display */}
        </motion.span>
      </motion.div>
    </div>
  );
}

// Scroll to top button that appears after scrolling
export function ScrollToTop({
  className = "",
  threshold = 0.1,
}: {
  className?: string;
  threshold?: number;
}) {
  const { scrollYProgress } = useScroll();

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <motion.button
      onClick={handleClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: scrollYProgress.get() > threshold ? 1 : 0,
        scale: scrollYProgress.get() > threshold ? 1 : 0.8,
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={`fixed bottom-8 right-8 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-lg ${className}`}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 17V3M3 10l7-7 7 7" />
      </svg>
    </motion.button>
  );
}

// Section progress indicator
export function SectionProgress({
  sections,
  className = "",
}: {
  sections: string[];
  className?: string;
}) {
  const { scrollYProgress } = useScroll();

  return (
    <div className={`fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-4 ${className}`}>
      {sections.map((section, index) => {
        const sectionProgress = index / sections.length;
        const nextSectionProgress = (index + 1) / sections.length;

        return (
          <motion.div
            key={section}
            className="flex items-center gap-3"
            initial={{ opacity: 0.3 }}
            animate={{
              opacity:
                scrollYProgress.get() >= sectionProgress &&
                scrollYProgress.get() < nextSectionProgress
                  ? 1
                  : 0.3,
            }}
          >
            <span className="text-xs text-right w-24 truncate">{section}</span>
            <motion.div
              className="w-2 h-2 rounded-full bg-primary"
              animate={{
                scale:
                  scrollYProgress.get() >= sectionProgress &&
                  scrollYProgress.get() < nextSectionProgress
                    ? 1.5
                    : 1,
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
