"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage, Message } from "./chat-message";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";
import { CognitiveStepIndicator } from "./cognitive-state-indicator";
import { FloatingOrbs } from "@/components/premium/GradientBg";
import { useFredChat } from "@/lib/hooks/use-fred-chat";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  className?: string;
}

const FRED_GREETING: Message = {
  id: "greeting",
  content:
    "Hey there! I'm Fred Cary \u2014 I started slinging tacos at 17, became a rock musician, then an attorney, and went on to build 40+ companies over 50 years. I've taken 3 companies public, created technology used in 75% of the world's TV households, and coached 10,000+ founders.\n\nThink of me as your digital co-founder, available 24/7. Whether you're validating an idea, preparing for fundraising, or figuring out your next big move \u2014 I'm here to give you the straight truth.\n\nF**k average, be legendary. What's on your mind?",
  role: "assistant",
  timestamp: new Date(),
};

export function ChatInterface({ className }: ChatInterfaceProps) {
  const { messages: fredMessages, sendMessage, state, isProcessing } = useFredChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Map FredMessage[] to Message[] (compatible shape) and prepend greeting
  const messages: Message[] = useMemo(() => {
    const mapped: Message[] = fredMessages.map((m) => ({
      id: m.id,
      content: m.content,
      role: m.role,
      timestamp: m.timestamp,
    }));
    return [FRED_GREETING, ...mapped];
  }, [fredMessages]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const handleSendMessage = async (content: string) => {
    await sendMessage(content);
  };

  return (
    <div className={cn("relative flex flex-col h-full", className)}>
      {/* Floating orbs background - chat variant with brand orange colors */}
      <FloatingOrbs variant="chat" />

      {/* Messages container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <ChatMessage key={message.id} message={message} index={index} />
          ))}
          {isProcessing && <TypingIndicator key="typing" />}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Cognitive state indicator */}
      {isProcessing && (
        <div className="flex justify-center py-2">
          <CognitiveStepIndicator state={state} />
        </div>
      )}

      {/* Input area */}
      <div className="sticky bottom-0 p-4 backdrop-blur-xl bg-background/80 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSend={handleSendMessage} isLoading={isProcessing} />
        </div>
      </div>
    </div>
  );
}
