"use client";

import { ChatInterface } from "@/components/chat/chat-interface";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-950 overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
      </div>

      {/* Header - Mobile Optimized */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-950/80 border-b border-gray-200 dark:border-gray-800"
      >
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <Link href="/">
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
      </motion.header>

      {/* Chat interface */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="container mx-auto px-4 h-[calc(100vh-73px)]"
      >
        <div className="h-full max-w-6xl mx-auto">
          <ChatInterface className="h-full" />
        </div>
      </motion.main>
    </div>
  );
}
