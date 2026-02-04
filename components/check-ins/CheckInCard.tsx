"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

interface CheckInCardProps {
  checkIn: {
    id: string;
    date: string;
    time: string;
    type: string;
    status: "pending" | "completed" | "missed";
    response?: string;
  };
}

export function CheckInCard({ checkIn }: CheckInCardProps) {
  const statusConfig = {
    pending: {
      icon: AlertCircle,
      color: "from-amber-500/20 to-orange-500/20",
      borderColor: "border-amber-500/30",
      iconColor: "text-amber-500",
      bg: "bg-amber-500/5",
    },
    completed: {
      icon: CheckCircle2,
      color: "from-emerald-500/20 to-green-500/20",
      borderColor: "border-emerald-500/30",
      iconColor: "text-emerald-500",
      bg: "bg-emerald-500/5",
    },
    missed: {
      icon: XCircle,
      color: "from-red-500/20 to-rose-500/20",
      borderColor: "border-red-500/30",
      iconColor: "text-red-500",
      bg: "bg-red-500/5",
    },
  };

  const config = statusConfig[checkIn.status];
  const StatusIcon = config.icon;

  return (
    <Link href={`/check-ins/${checkIn.id}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="relative group cursor-pointer"
      >
        <div
          className={`relative overflow-hidden rounded-2xl border ${config.borderColor}
          backdrop-blur-xl bg-white/5 dark:bg-black/5 p-6 transition-all duration-300
          hover:shadow-2xl hover:shadow-primary/10`}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-50
            group-hover:opacity-70 transition-opacity duration-300`}
          />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`${config.bg} p-2.5 rounded-xl`}>
                  <StatusIcon className={`w-5 h-5 ${config.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground capitalize">
                    {checkIn.type} Check-In
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {checkIn.status.charAt(0).toUpperCase() + checkIn.status.slice(1)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{checkIn.date}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{checkIn.time}</span>
              </div>
            </div>

            {checkIn.response && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {checkIn.response}
                </p>
              </div>
            )}

            <motion.div
              className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0"
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
