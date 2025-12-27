"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PhoneMockupProps {
  children?: ReactNode;
  className?: string;
  screenClassName?: string;
  floating?: boolean;
  rotate?: number;
}

export function PhoneMockup({
  children,
  className = "",
  screenClassName = "",
  floating = true,
  rotate = 0,
}: PhoneMockupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`relative ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {floating && (
        <motion.div
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative"
        >
          <PhoneFrame screenClassName={screenClassName}>{children}</PhoneFrame>
        </motion.div>
      )}
      {!floating && (
        <PhoneFrame screenClassName={screenClassName}>{children}</PhoneFrame>
      )}
    </motion.div>
  );
}

function PhoneFrame({
  children,
  screenClassName,
}: {
  children?: ReactNode;
  screenClassName?: string;
}) {
  return (
    <div className="relative">
      {/* Phone outer frame */}
      <div className="relative w-[280px] h-[580px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-[45px] p-[12px] shadow-2xl">
        {/* Inner bezel */}
        <div className="relative w-full h-full bg-black rounded-[35px] overflow-hidden">
          {/* Dynamic Island / Notch */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-[90px] h-[26px] bg-black rounded-full z-20" />

          {/* Screen content */}
          <div className={`w-full h-full bg-gradient-to-br from-gray-900 to-black ${screenClassName}`}>
            {children}
          </div>

          {/* Screen reflection */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
        </div>

        {/* Side buttons */}
        <div className="absolute -left-[3px] top-[100px] w-[3px] h-[30px] bg-gray-700 rounded-l-sm" />
        <div className="absolute -left-[3px] top-[150px] w-[3px] h-[60px] bg-gray-700 rounded-l-sm" />
        <div className="absolute -left-[3px] top-[220px] w-[3px] h-[60px] bg-gray-700 rounded-l-sm" />
        <div className="absolute -right-[3px] top-[140px] w-[3px] h-[80px] bg-gray-700 rounded-r-sm" />
      </div>

      {/* Shadow */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[200px] h-[20px] bg-black/30 blur-xl rounded-full" />
    </div>
  );
}

// Pre-built phone screens
export function PhoneScreenChat({
  messages,
  children
}: {
  messages?: { role: "user" | "ai"; text: string }[];
  children?: ReactNode;
}) {
  // If children are provided, render them directly
  if (children) {
    return (
      <div className="h-full flex flex-col">
        {children}
      </div>
    );
  }

  // Otherwise render the default chat layout
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-primary/20 backdrop-blur-sm px-4 py-3 pt-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
            <span className="text-white font-bold text-sm">FC</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Fred Cary</p>
            <p className="text-white/60 text-xs">Founder Decision OS</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {messages && (
        <div className="flex-1 p-3 space-y-3 overflow-hidden">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.3 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-br-none"
                    : "bg-white/10 text-white rounded-bl-none"
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 bg-black/30">
        <div className="bg-white/10 rounded-full px-4 py-2 text-white/50 text-xs">
          Ask Fred anything...
        </div>
      </div>
    </div>
  );
}

// Flexible custom screen that accepts children
export function PhoneScreenCustom({ children }: { children: ReactNode }) {
  return (
    <div className="h-full flex flex-col">
      {children}
    </div>
  );
}

export function PhoneScreenDashboard({
  score,
  title,
  items,
  children,
}: {
  score?: number;
  title?: string;
  items?: { label: string; value: string; color?: string }[];
  children?: ReactNode;
}) {
  // If children are provided, render them directly
  if (children) {
    return (
      <div className="h-full flex flex-col">
        {children}
      </div>
    );
  }

  // Otherwise render the default dashboard layout
  return (
    <div className="h-full flex flex-col p-4 pt-12">
      {/* Header */}
      <div className="text-center mb-4">
        {title && <p className="text-white/60 text-xs mb-1">{title}</p>}
        {score !== undefined && (
          <div className="relative w-24 h-24 mx-auto">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
                fill="none"
              />
              <motion.circle
                cx="48"
                cy="48"
                r="40"
                stroke="url(#gradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: score / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{score}</span>
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      {items && (
        <div className="space-y-2 flex-1">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="bg-white/5 rounded-lg p-3 flex justify-between items-center"
            >
              <span className="text-white/70 text-xs">{item.label}</span>
              <span className={`text-xs font-medium ${item.color || "text-white"}`}>
                {item.value}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
