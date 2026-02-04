"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface RadarDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  maxValue?: number;
  size?: number;
  animate?: boolean;
}

export function RadarChart({
  data,
  maxValue = 100,
  size = 400,
  animate = true,
}: RadarChartProps) {
  const [isVisible, setIsVisible] = useState(false);
  const center = size / 2;
  const radius = (size / 2) * 0.8;
  const levels = 5;
  const angleSlice = (Math.PI * 2) / data.length;

  useEffect(() => {
    if (animate) {
      setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(true);
    }
  }, [animate]);

  const getPointPosition = (index: number, value: number) => {
    const angle = angleSlice * index - Math.PI / 2;
    const distance = (value / maxValue) * radius;
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    };
  };

  const getLabelPosition = (index: number) => {
    const angle = angleSlice * index - Math.PI / 2;
    const distance = radius + 40;
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    };
  };

  const pathData =
    data
      .map((point, i) => {
        const pos = getPointPosition(i, point.value);
        return `${i === 0 ? "M" : "L"} ${pos.x} ${pos.y}`;
      })
      .join(" ") + " Z";

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <linearGradient
            id="radarGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.5)" />
            <stop offset="100%" stopColor="rgba(147, 51, 234, 0.5)" />
          </linearGradient>
          <filter id="radarGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid circles */}
        {Array.from({ length: levels }).map((_, i) => {
          const r = ((i + 1) / levels) * radius;
          return (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
              className="dark:stroke-white/10"
            />
          );
        })}

        {/* Axes */}
        {data.map((_, i) => {
          const pos = getPointPosition(i, maxValue);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={pos.x}
              y2={pos.y}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
              className="dark:stroke-white/20"
            />
          );
        })}

        {/* Data polygon */}
        <motion.path
          d={pathData}
          fill="url(#radarGradient)"
          stroke="#3b82f6"
          strokeWidth="2"
          filter="url(#radarGlow)"
          initial={{ scale: 0, opacity: 0 }}
          animate={
            isVisible ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }
          }
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />

        {/* Data points */}
        {data.map((point, i) => {
          const pos = getPointPosition(i, point.value);
          return (
            <motion.g
              key={i}
              initial={{ scale: 0 }}
              animate={isVisible ? { scale: 1 } : { scale: 0 }}
              transition={{ delay: 0.5 + i * 0.1, type: "spring" }}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r="6"
                fill="#3b82f6"
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-all hover:scale-110"
              />
            </motion.g>
          );
        })}

        {/* Labels */}
        {data.map((point, i) => {
          const pos = getLabelPosition(i);
          return (
            <motion.text
              key={i}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-medium fill-current text-foreground"
              initial={{ opacity: 0 }}
              animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.8 + i * 0.1 }}
            >
              <tspan x={pos.x} dy="0">
                {point.label}
              </tspan>
              <tspan x={pos.x} dy="15" className="text-primary font-bold">
                {Math.round(point.value)}
              </tspan>
            </motion.text>
          );
        })}
      </svg>
    </div>
  );
}
