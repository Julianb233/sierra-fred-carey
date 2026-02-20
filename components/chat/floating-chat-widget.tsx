"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Pages where the widget should NOT appear (full chat page exists)
const HIDDEN_PATHS = ["/chat", "/dashboard/coaching"];

export function FloatingChatWidget({
  onCallFred,
}: {
  onCallFred?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Hide on certain pages
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return (
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
          onClick={() => router.push("/chat")}
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
  );
}
