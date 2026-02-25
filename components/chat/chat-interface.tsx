"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

// ============================================================================
// Suggestion chips — page-aware quick-start prompts
// ============================================================================

const DEFAULT_CHIPS = [
  "Show me what's on this platform",
  "Where should I start?",
  "What are my most important next steps?",
];

const PAGE_CHIPS: Record<string, string[]> = {
  "/dashboard/wellbeing": [
    "What should I do if my stress is too high?",
    "Walk me through the wellbeing tracker",
    "How does stress affect my startup performance?",
  ],
  "/dashboard/reality-lens": [
    "Walk me through the 5 validation dimensions",
    "What happens if I fail a dimension?",
    "How do I strengthen a weak area?",
  ],
  "/dashboard/startup-process": [
    "Explain the 9-step startup process",
    "Which step should I focus on right now?",
    "How do I advance to the next step?",
  ],
  "/dashboard/investor-readiness": [
    "How do I improve my investor readiness score?",
    "What do investors look for at my stage?",
    "Walk me through each readiness dimension",
  ],
  "/dashboard/pitch-deck": [
    "What makes a strong pitch deck?",
    "How does the deck review work?",
    "What are investors most focused on?",
  ],
  "/dashboard/strategy": [
    "How do I sharpen my positioning?",
    "Walk me through the positioning framework",
    "What's my biggest strategic gap?",
  ],
  "/dashboard/next-steps": [
    "Which of my next steps should I tackle first?",
    "How were these next steps generated?",
    "What's blocking me from moving forward?",
  ],
  "/dashboard/coaching": [
    "What can I get out of a coaching session?",
    "How do I prepare for my next session?",
    "What topics should I focus on with Fred?",
  ],
  "/dashboard/journey": [
    "Where am I on the founder journey?",
    "What milestones should I hit next?",
    "How do I accelerate my progress?",
  ],
};

function getSuggestionChips(pageContext?: string): string[] {
  if (!pageContext) return DEFAULT_CHIPS;
  // Try exact match, then prefix match
  if (PAGE_CHIPS[pageContext]) return PAGE_CHIPS[pageContext];
  const match = Object.keys(PAGE_CHIPS).find((p) => pageContext.startsWith(p));
  return match ? PAGE_CHIPS[match] : DEFAULT_CHIPS;
}

interface ChatInterfaceProps {
  className?: string;
  /** Current page path — passed to FRED so it can help users navigate the platform */
  pageContext?: string;
  /** Pre-seeded message to auto-send once when the overlay opens (e.g. from a Help button) */
  initialMessage?: string;
  /** Called after the initialMessage has been sent, so the parent can clear it */
  onInitialMessageConsumed?: () => void;
}

function buildFredGreeting(): Message {
  return {
    id: "greeting",
    content: `Hey there! I'm Fred Cary. ${getExperienceStatement()}\n\n${getCredibilityStatement()}\n\nThink of me as your digital co-founder, available 24/7. Whether you're validating an idea, preparing for fundraising, or figuring out your next big move \u2014 I'm here to give you the straight truth.\n\n"${getRandomQuote()}" What's on your mind?`,
    role: "assistant",
    timestamp: new Date(),
  };
}

export function ChatInterface({ className, pageContext, initialMessage, onInitialMessageConsumed }: ChatInterfaceProps) {
  const { messages: fredMessages, sendMessage, state, isProcessing } = useFredChat({ pageContext });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [greeting] = useState<Message>(() => buildFredGreeting());
  const sessionTrackedRef = useRef(false);
  const initialMessageSentRef = useRef(false);

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

  // Auto-send initialMessage once when the overlay opens.
  // Delay 400ms so any in-flight request from sessionStorage restoration settles first.
  useEffect(() => {
    if (!initialMessage || initialMessageSentRef.current) return;
    const timer = setTimeout(() => {
      if (!initialMessageSentRef.current) {
        initialMessageSentRef.current = true;
        handleSendMessage(initialMessage);
        onInitialMessageConsumed?.();
      }
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

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

      {/* Suggestion chips — shown only before first message */}
      <AnimatePresence>
        {fredMessages.length === 0 && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-2"
          >
            <div className="max-w-4xl mx-auto flex flex-wrap gap-2">
              {getSuggestionChips(pageContext).map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSendMessage(chip)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border",
                    "bg-white/10 border-white/20 text-foreground/80",
                    "hover:bg-[#ff6a1a]/10 hover:border-[#ff6a1a]/40 hover:text-[#ff6a1a]",
                    "transition-all duration-200 cursor-pointer"
                  )}
                >
                  {chip}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="sticky bottom-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl bg-background/80 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSend={handleSendMessage} isLoading={isProcessing} showVoiceInput />
        </div>
      </div>
    </div>
  );
}
