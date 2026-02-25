"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { ChatMessage, Message } from "./chat-message";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";
import { CognitiveStepIndicator } from "./cognitive-state-indicator";
import { FloatingOrbs } from "@/components/premium/GradientBg";
import { useFredChat } from "@/lib/hooks/use-fred-chat";
import { getRandomQuote, getExperienceStatement, getCredibilityStatement } from "@/lib/fred-brain";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

interface ChatInterfaceProps {
  className?: string;
  /** Current page path — passed to FRED so it can help users navigate the platform */
  pageContext?: string;
}

function buildFredGreeting(): Message {
  return {
    id: "greeting",
    content: `Hey there! I'm Fred Cary. ${getExperienceStatement()}\n\n${getCredibilityStatement()}\n\nThink of me as your digital co-founder, available 24/7. Whether you're validating an idea, preparing for fundraising, or figuring out your next big move \u2014 I'm here to give you the straight truth.\n\n"${getRandomQuote()}" What's on your mind?`,
    role: "assistant",
    timestamp: new Date(),
  };
}

export function ChatInterface({ className, pageContext }: ChatInterfaceProps) {
  const { messages: fredMessages, sendMessage, state, isProcessing } = useFredChat({ pageContext });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [greeting] = useState<Message>(() => buildFredGreeting());
  const sessionTrackedRef = useRef(false);

  // Map FredMessage[] to Message[] (compatible shape) and prepend greeting
  const messages: Message[] = useMemo(() => {
    const mapped: Message[] = fredMessages.map((m) => ({
      id: m.id,
      content: m.content,
      role: m.role,
      timestamp: m.timestamp,
    }));
    return [greeting, ...mapped];
  }, [fredMessages, greeting]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const handleSendMessage = async (content: string) => {
    if (!sessionTrackedRef.current) {
      trackEvent(ANALYTICS_EVENTS.CHAT.SESSION_STARTED);
      sessionTrackedRef.current = true;
    }
    await sendMessage(content);
  };

  return (
    <div className={cn("relative flex flex-col h-full", className)}>
      {/* Floating orbs background - chat variant with brand orange colors */}
      <FloatingOrbs variant="chat" />

      {/* Messages container */}
      <div
        ref={messagesContainerRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation with Fred"
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              index={index}
              showTts={message.role === "assistant" && message.content.length > 20}
            />
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
      <div className="sticky bottom-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl bg-background/80 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSend={handleSendMessage} isLoading={isProcessing} showVoiceInput />
        </div>
      </div>
    </div>
  );
}
