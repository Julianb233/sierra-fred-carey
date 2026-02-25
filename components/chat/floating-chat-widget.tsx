"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChatInterface } from "@/components/chat/chat-interface";
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
  const [isOpen, setIsOpen] = useState(false);
  const pendingMessageRef = useRef<string | undefined>(undefined);

  // Listen for programmatic open requests (e.g. from the sidebar Help button)
  useEffect(() => {
    function handleOpen(e: Event) {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      pendingMessageRef.current = detail?.message;
      setIsOpen(true);
    }
    window.addEventListener("fred:open", handleOpen);
    return () => window.removeEventListener("fred:open", handleOpen);
  }, []);

  // Hide on certain pages
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) {
    return null;
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
          {onCallFred && (
            <Button
              onClick={onCallFred}
              size="icon"
              className={cn(
                "h-12 w-12 rounded-full shadow-lg",
                "bg-white text-[#ff6a1a] hover:text-white",
                "hover:bg-[#ff6a1a] border border-[#ff6a1a]",
                "hover:shadow-xl hover:shadow-[#ff6a1a]/25",
                "transition-all duration-300"
              )}
              aria-label="Call Fred (voice)"
            >
              <Phone className="h-5 w-5" />
            </Button>
          )}
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

          {/* Chat — fills remaining height */}
          <div className="flex-1 min-h-0">
            <ChatInterface
              className="h-full"
              pageContext={pathname}
              initialMessage={pendingMessageRef.current}
              onInitialMessageConsumed={() => {
                pendingMessageRef.current = undefined;
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
