"use client";

import { useEffect, createContext, useContext, ReactNode } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Draggable } from "gsap/Draggable";
import { TextPlugin } from "gsap/TextPlugin";

// Register plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, Draggable, TextPlugin, useGSAP);
}

interface GSAPContextValue {
  gsap: typeof gsap;
  ScrollTrigger: typeof ScrollTrigger;
  Draggable: typeof Draggable;
}

const GSAPContext = createContext<GSAPContextValue | null>(null);

export function useGSAPContext() {
  const context = useContext(GSAPContext);
  if (!context) {
    throw new Error("useGSAPContext must be used within a GSAPProvider");
  }
  return context;
}

interface GSAPProviderProps {
  children: ReactNode;
}

export function GSAPProvider({ children }: GSAPProviderProps) {
  useEffect(() => {
    // Configure GSAP defaults
    gsap.config({
      nullTargetWarn: false,
    });

    // Set default easing
    gsap.defaults({
      ease: "power3.out",
      duration: 0.6,
    });

    return () => {
      // Cleanup all ScrollTriggers on unmount
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  const value: GSAPContextValue = {
    gsap,
    ScrollTrigger,
    Draggable,
  };

  return <GSAPContext.Provider value={value}>{children}</GSAPContext.Provider>;
}

// Custom hooks for common GSAP patterns
export function useSplitText(selector: string, delay = 0) {
  useGSAP(() => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      const text = el.textContent || "";
      el.textContent = "";
      text.split("").forEach((char, i) => {
        const span = document.createElement("span");
        span.textContent = char === " " ? "\u00A0" : char;
        span.style.display = "inline-block";
        span.style.opacity = "0";
        span.style.transform = "translateY(20px)";
        el.appendChild(span);

        gsap.to(span, {
          opacity: 1,
          y: 0,
          duration: 0.05,
          delay: delay + i * 0.03,
          ease: "power2.out",
        });
      });
    });
  }, [selector, delay]);
}

export function useScrollReveal(selector: string, options = {}) {
  useGSAP(() => {
    gsap.from(selector, {
      scrollTrigger: {
        trigger: selector,
        start: "top 80%",
        toggleActions: "play none none reverse",
        ...options,
      },
      opacity: 0,
      y: 60,
      duration: 0.8,
      stagger: 0.15,
    });
  }, [selector]);
}

export function useMagneticButton(selector: string) {
  useGSAP(() => {
    const buttons = document.querySelectorAll(selector);

    buttons.forEach((button) => {
      const btn = button as HTMLElement;

      btn.addEventListener("mousemove", (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        gsap.to(btn, {
          x: x * 0.3,
          y: y * 0.3,
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
    });
  }, [selector]);
}

export { gsap, ScrollTrigger, Draggable };
