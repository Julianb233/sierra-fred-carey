"use client";

import { motion } from "framer-motion";
import { Flame, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

interface StreakCounterProps {
  currentStreak: number;
  bestStreak: number;
}

export function StreakCounter({ currentStreak, bestStreak }: StreakCounterProps) {
  const [celebrate, setCelebrate] = useState(false);

  // Pre-compute random particle positions to avoid impure calls during render
  const [particleOffsets, setParticleOffsets] = useState(
    () => Array.from({ length: 12 }, () => ({
      x: 50 + (Math.random() - 0.5) * 100,
      y: 50 + (Math.random() - 0.5) * 100,
    }))
  );

  useEffect(() => {
    if (currentStreak > 0 && currentStreak % 5 === 0) {
      const timer = setTimeout(() => {
        setParticleOffsets(Array.from({ length: 12 }, () => ({
          x: 50 + (Math.random() - 0.5) * 100,
          y: 50 + (Math.random() - 0.5) * 100,
        })));
        setCelebrate(true);
      }, 0);
      const endTimer = setTimeout(() => setCelebrate(false), 2000);
      return () => {
        clearTimeout(timer);
        clearTimeout(endTimer);
      };
    }
  }, [currentStreak]);

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return "from-purple-500 to-pink-500";
    if (streak >= 14) return "from-orange-500 to-red-500";
    if (streak >= 7) return "from-yellow-500 to-orange-500";
    return "from-blue-500 to-cyan-500";
  };

  return (
    <div className="relative">
      <motion.div
        animate={celebrate ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 backdrop-blur-xl bg-gradient-to-br from-white/5 to-white/10 dark:from-black/5 dark:to-black/10 p-8"
      >
        <motion.div
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear",
          }}
          className={`absolute inset-0 bg-gradient-to-r ${getStreakColor(currentStreak)} opacity-10`}
          style={{ backgroundSize: "200% 200%" }}
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{
                rotate: celebrate ? [0, -10, 10, -10, 0] : 0,
                scale: celebrate ? [1, 1.2, 1] : 1,
              }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="relative">
                <motion.div
                  animate={{
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className={`absolute inset-0 bg-gradient-to-r ${getStreakColor(currentStreak)} blur-xl`}
                />
                <div className={`relative p-4 rounded-2xl bg-gradient-to-br ${getStreakColor(currentStreak)}`}>
                  <Flame className="w-8 h-8 text-white" />
                </div>
              </div>
            </motion.div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Streak</p>
              <motion.p
                key={currentStreak}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
              >
                {currentStreak}
              </motion.p>
              <p className="text-xs text-muted-foreground">week{currentStreak !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 dark:bg-black/5 border border-white/10">
            <Trophy className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">Best</p>
              <p className="text-2xl font-bold text-foreground">{bestStreak}</p>
            </div>
          </div>
        </div>

        {celebrate && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: "50%",
                  y: "50%",
                  scale: 0,
                  opacity: 1,
                }}
                animate={{
                  x: `${particleOffsets[i].x}%`,
                  y: `${particleOffsets[i].y}%`,
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: 1,
                  delay: i * 0.05,
                }}
                className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
              />
            ))}
          </div>
        )}
      </motion.div>

      {currentStreak >= 7 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
        >
          <p className="text-sm text-center text-foreground font-medium">
            {currentStreak >= 30 && "🔥 You're unstoppable! 30+ weeks!"}
            {currentStreak >= 14 && currentStreak < 30 && "💪 Two weeks strong! Keep it up!"}
            {currentStreak >= 7 && currentStreak < 14 && "🎯 One week streak! You're building momentum!"}
          </p>
        </motion.div>
      )}
    </div>
  );
}
