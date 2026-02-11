"use client";

import { ChatInterface } from "@/components/chat/chat-interface";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MessageCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function ChatPage() {
  const handleExport = async (format: "json" | "markdown" | "csv") => {
    try {
      const res = await fetch(`/api/fred/export?format=${format}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(err.error || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "markdown" ? "md" : format;
      a.download = `fred-chat-export-${new Date().toISOString().split("T")[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Chat history exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-white via-orange-50/30 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 overflow-hidden">
      {/* Enhanced background with multiple layers */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Primary glow - top left */}
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-[#ff6a1a]/15 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />
        {/* Secondary glow - bottom right */}
        <div className="absolute -bottom-32 -right-20 w-[600px] h-[600px] bg-orange-400/12 rounded-full blur-[180px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        {/* Accent glow - center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-amber-500/8 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      {/* Header - Mobile Optimized */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-950/80 border-b border-gray-200 dark:border-gray-800"
      >
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 text-gray-700 dark:text-gray-300 hover:text-[#ff6a1a] hover:bg-[#ff6a1a]/10 px-2 sm:px-3">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[#ff6a1a]" />
              <h1 className="text-base sm:text-xl font-bold text-[#ff6a1a]">
                Talk to Fred
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 text-gray-700 dark:text-gray-300 hover:text-[#ff6a1a] hover:bg-[#ff6a1a]/10 px-2">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs">Export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("json")}>
                    Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("markdown")}>
                    Export as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("csv")}>
                    Export as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/">
                <Image
                  src="/sahara-logo.svg"
                  alt="Sahara"
                  width={80}
                  height={20}
                  className="h-5 sm:h-6 w-auto opacity-70 hover:opacity-100 transition-opacity"
                />
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Chat interface */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="container mx-auto px-4 h-[calc(100dvh-57px)] sm:h-[calc(100dvh-73px)]"
      >
        <div className="h-full max-w-6xl mx-auto">
          <ChatInterface className="h-full" />
        </div>
      </motion.main>
    </div>
  );
}
