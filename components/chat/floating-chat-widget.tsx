"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Mic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChatInterface } from "@/components/chat/chat-interface";
import { VoiceChatOverlay } from "@/components/chat/voice-chat-overlay";
import { cn } from "@/lib/utils";

// Pages where the widget should NOT appear (full chat page already exists)
const HIDDEN_PATHS = ["/chat", "/dashboard/coaching"];

/** Dispatch this event from anywhere to open the FRED overlay with an optional pre-seeded message */
export function openFredChat(message?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fred:open", { detail: { message } }));
  }
}

export function FloatingChatWidget({
  onCallFred,
}: {
  onCallFred?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | undefined>(undefined);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const sendMessageRef = useRef<((msg: string) => void) | null>(null);

  // Listen for programmatic open requests (e.g. from the sidebar Help button)
  useEffect(() => {
    function handleOpen(e: Event) {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      setPendingMessage(detail?.message);
      setIsOpen(true);
    }
    // Listen for voice open requests from MobileBottomNav
    function handleVoice() {
      // If on chat page, dispatch to the chat page's voice overlay
      if (pathname.startsWith("/chat")) {
        // The chat page handles its own voice overlay
        return;
      }
      setVoiceOverlayOpen(true);
    }
    window.addEventListener("fred:open", handleOpen);
    window.addEventListener("fred:voice", handleVoice);
    return () => {
      window.removeEventListener("fred:open", handleOpen);
      window.removeEventListener("fred:voice", handleVoice);
    };
  }, [pathname]);

  // Handle voice overlay sending a message — open chat and send
  const handleVoiceSend = useCallback(
    (text: string) => {
      setVoiceOverlayOpen(false);
      // Navigate to chat with the message
      router.push(`/chat?message=${encodeURIComponent(text)}`);
    },
    [router]
  );

  // Hide on certain pages
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) {
    return (
      <>
        {/* Still render voice overlay even on hidden paths for mobile nav */}
        <VoiceChatOverlay
          open={voiceOverlayOpen}
          onClose={() => setVoiceOverlayOpen(false)}
          onSendMessage={handleVoiceSend}
        />
      </>
    );
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed z-50 right-4 lg:right-6 flex flex-col gap-3 items-end"
          style={{
            bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {/* Voice Chat — prominent, always visible */}
          <Button
            onClick={() => setVoiceOverlayOpen(true)}
            size="icon"
            className={cn(
              "h-12 w-12 rounded-full shadow-lg",
              "bg-white dark:bg-gray-900 text-[#ff6a1a]",
              "border border-[#ff6a1a]/30",
              "hover:bg-[#ff6a1a] hover:text-white",
              "hover:shadow-xl hover:shadow-[#ff6a1a]/25",
              "transition-all duration-300"
            )}
            aria-label="Voice chat with Fred"
          >
            <Mic className="h-5 w-5" />
          </Button>

          {/* Text Chat — primary large button */}
          <Button
            onClick={() => setIsOpen(true)}
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full shadow-lg",
              "bg-[#ff6a1a] hover:bg-[#ea580c]",
              "hover:shadow-xl hover:shadow-[#ff6a1a]/30",
              "transition-all duration-300",
              "text-white border-0"
            )}
            aria-label="Chat with Fred"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </motion.div>
      </AnimatePresence>

      {/* In-page chat overlay — slides in from the right, stays on current page */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className={cn(
            "w-full sm:w-[440px] p-0 flex flex-col",
            "border-l border-gray-200 dark:border-gray-800",
            "[&>button]:hidden" // hide default SheetContent close button; we have our own
          )}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#ff6a1a]" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                Talk to Fred
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsOpen(false);
                  setVoiceOverlayOpen(true);
                }}
                className="h-8 w-8 text-[#ff6a1a] hover:bg-[#ff6a1a]/10"
                aria-label="Switch to voice input"
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat — fills remaining height */}
          <div className="flex-1 min-h-0">
            <ChatInterface
              className="h-full"
              pageContext={pathname}
              initialMessage={pendingMessage}
              onInitialMessageConsumed={() => {
                setPendingMessage(undefined);
              }}
              onSendRef={sendMessageRef}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Voice Chat Overlay — Whisper Flow powered */}
      <VoiceChatOverlay
        open={voiceOverlayOpen}
        onClose={() => setVoiceOverlayOpen(false)}
        onSendMessage={handleVoiceSend}
      />
    </>
  );
}
