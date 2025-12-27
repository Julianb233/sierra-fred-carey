"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

type AgentStatus = "active" | "idle" | "busy";

interface AgentAvatarProps {
  icon: LucideIcon;
  color: string;
  status: AgentStatus;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: {
    container: "w-12 h-12",
    icon: "w-6 h-6",
    ring: "w-14 h-14",
    glow: "w-16 h-16",
  },
  md: {
    container: "w-16 h-16",
    icon: "w-8 h-8",
    ring: "w-18 h-18",
    glow: "w-20 h-20",
  },
  lg: {
    container: "w-20 h-20",
    icon: "w-10 h-10",
    ring: "w-22 h-22",
    glow: "w-24 h-24",
  },
  xl: {
    container: "w-32 h-32",
    icon: "w-16 h-16",
    ring: "w-36 h-36",
    glow: "w-40 h-40",
  },
};

const colorMap = {
  blue: {
    gradient: "from-blue-500 to-blue-600",
    ring: "border-blue-500",
    glow: "bg-blue-500/20",
    bg: "bg-gradient-to-br from-blue-500/20 to-blue-600/10",
  },
  purple: {
    gradient: "from-purple-500 to-purple-600",
    ring: "border-purple-500",
    glow: "bg-purple-500/20",
    bg: "bg-gradient-to-br from-purple-500/20 to-purple-600/10",
  },
  green: {
    gradient: "from-green-500 to-green-600",
    ring: "border-green-500",
    glow: "bg-green-500/20",
    bg: "bg-gradient-to-br from-green-500/20 to-green-600/10",
  },
  orange: {
    gradient: "from-orange-500 to-orange-600",
    ring: "border-orange-500",
    glow: "bg-orange-500/20",
    bg: "bg-gradient-to-br from-orange-500/20 to-orange-600/10",
  },
};

export default function AgentAvatar({
  icon: Icon,
  color,
  status,
  size = "md",
}: AgentAvatarProps) {
  const sizes = sizeMap[size];
  const colors = colorMap[color as keyof typeof colorMap];

  const isAnimated = status === "active" || status === "busy";

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Outer glow effect */}
      {isAnimated && (
        <motion.div
          className={`absolute inset-0 ${sizes.glow} ${colors.glow} rounded-full blur-xl opacity-50`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Rotating status ring */}
      {isAnimated && (
        <motion.div
          className={`absolute ${sizes.ring}`}
          animate={{ rotate: 360 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="2"
              strokeDasharray="150 150"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className={colors.ring} stopOpacity="1" />
                <stop offset="100%" className={colors.ring} stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      )}

      {/* Static border for idle state */}
      {!isAnimated && (
        <div className={`absolute ${sizes.ring} border-2 ${colors.ring} opacity-30 rounded-full`} />
      )}

      {/* Avatar container */}
      <motion.div
        className={`relative ${sizes.container} rounded-full ${colors.bg} backdrop-blur-sm
          border-2 border-white/10 flex items-center justify-center overflow-hidden`}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        {/* Gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-20`} />

        {/* Icon */}
        <Icon className={`${sizes.icon} text-white relative z-10`} />

        {/* Shine effect on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0"
          initial={{ x: "-100%", y: "-100%" }}
          whileHover={{ x: "100%", y: "100%" }}
          transition={{ duration: 0.6 }}
        />
      </motion.div>

      {/* Floating particles for active status */}
      {status === "active" && (
        <>
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              className={`absolute w-1 h-1 rounded-full bg-gradient-to-r ${colors.gradient}`}
              style={{
                top: "50%",
                left: "50%",
              }}
              animate={{
                x: [0, (i - 1) * 30, 0],
                y: [0, -40 - i * 10, 0],
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeOut",
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
