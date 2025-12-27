"use client";

import { motion, useInView, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { FadeUpOnScroll, GradientText } from "@/components/premium/AnimatedText";
import { GlassCard3D } from "@/components/premium/Card3D";

function AnimatedCounter({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
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
  }, [isInView, end]);

  return (
    <span ref={ref}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}

export default function Stats() {
  const stats = [
    { number: 10000, prefix: "", suffix: "+", label: "Founders Coached" },
    { number: 50, prefix: "$", suffix: "M+", label: "Capital Raised" },
    { number: 500, prefix: "", suffix: "+", label: "Decks Reviewed" },
    { number: 89, prefix: "", suffix: "%", label: "Investor Meeting Rate" },
  ];

  return (
    <section className="relative py-24 px-4 overflow-hidden bg-white dark:bg-gray-950">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#ff6a1a]/5 to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <FadeUpOnScroll className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Trusted by <span className="text-[#ff6a1a]">thousands</span> of founders worldwide
          </h2>
        </FadeUpOnScroll>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <FadeUpOnScroll key={index} delay={index * 0.1}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 md:p-8 text-center border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg hover:border-[#ff6a1a]/30 transition-all duration-300">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: 0.2 + index * 0.1,
                    type: "spring",
                    stiffness: 100
                  }}
                >
                  <div className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 text-[#ff6a1a]">
                    <AnimatedCounter
                      end={stat.number}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                    />
                  </div>
                  <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium">
                    {stat.label}
                  </div>
                </motion.div>
              </div>
            </FadeUpOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
