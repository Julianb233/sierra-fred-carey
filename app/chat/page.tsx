"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ActiveModeBar, type ChatMode } from "@/components/chat/active-mode-bar";
import { ChatSidePanel } from "@/components/chat/chat-side-panel";
import { VoiceChatOverlay } from "@/components/chat/voice-chat-overlay";
import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  GraduationCap,
  Download,
  PanelRight,
  PanelRightClose,
  Phone,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { CallFredModal } from "@/components/dashboard/call-fred-modal";
import { VoiceCallContextBanner } from "@/components/chat/voice-call-context-banner";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";
import { cn } from "@/lib/utils";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeMode, setActiveMode] = useState<ChatMode>("founder-os");
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [lastDiscussedTopic, setLastDiscussedTopic] = useState<string | null>(null);
  const [lastCallSummary, setLastCallSummary] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { tier } = useUserTier();
  const isProOrAbove = tier >= UserTier.PRO;

  // Ref to imperatively send a message via ChatInterface
  const sendMessageRef = useRef<((msg: string) => void) | null>(null);

  // Pre-seeded message from dashboard chip (e.g. ?message=...)
  const initialMessage = searchParams.get("message") ?? undefined;

  const handleInitialMessageConsumed = useCallback(() => {
    // Remove ?message= from URL after it's been auto-sent
    router.replace("/chat", { scroll: false });
  }, [router]);

  const handleCallClick = useCallback(() => {
    setCallModalOpen(true);
  }, []);

  const handleVoiceClick = useCallback(() => {
    setVoiceOverlayOpen(true);
  }, []);

  // When voice overlay produces text, send it to the chat
  const handleVoiceSend = useCallback((text: string) => {
    if (sendMessageRef.current) {
      sendMessageRef.current(text);
    }
  }, []);

  // Keyboard shortcut: press V to open voice overlay (when not typing)
  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        setVoiceOverlayOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Auto-collapse side panel on mobile
  useEffect(() => {
    if (isMobile && sidePanelOpen) {
      setSidePanelOpen(false);
    }
  }, [isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch voice context for pre-call banner
  useEffect(() => {
    let cancelled = false;

    async function fetchVoiceContext() {
      try {
        const res = await fetch("/api/voice/context");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.lastTopic) {
          setLastDiscussedTopic(data.lastTopic);
        }
      } catch {
        // Non-critical -- banner just won't show
      }
    }

    fetchVoiceContext();

    return () => {
      cancelled = true;
    };
  }, []);

  // Poll for active mode from conversation state
  useEffect(() => {
    let cancelled = false;

    async function fetchMode() {
      try {
        const res = await fetch("/api/fred/mode");
        if (!res.ok) return;
        const data = await res.json();
        const mode = data.data?.activeMode || data.mode;
        if (!cancelled && mode) {
          setActiveMode(mode as ChatMode);
        }
      } catch {
        // Non-critical -- keep current mode
      }
    }

    fetchMode();
    const interval = setInterval(fetchMode, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

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
    <div className="h-dvh flex flex-col bg-white dark:bg-gray-950">
      {/* Top Bar */}
      <header className="shrink-0 flex items-center justify-between px-3 sm:px-4 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 z-10">
        <Link href="/dashboard">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-gray-700 dark:text-gray-300 hover:text-[#ff6a1a] hover:bg-[#ff6a1a]/10 px-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">Back</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-[#ff6a1a]" />
          <h1 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
            Your Mentor
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {/* Voice input — prominent header button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleVoiceClick}
            className="gap-1 text-[#ff6a1a] hover:text-[#ea580c] hover:bg-[#ff6a1a]/10 px-2"
            aria-label="Voice input (press V)"
            title="Voice input (V)"
          >
            <Mic className="h-4 w-4" />
            <span className="hidden sm:inline text-xs font-medium">Voice</span>
          </Button>

          {/* Call Fred — shown to all; Pro+ unlocks real-time voice */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCallClick}
            className="gap-1 text-gray-700 dark:text-gray-300 hover:text-[#ff6a1a] hover:bg-[#ff6a1a]/10 px-2"
            aria-label="Call Fred"
          >
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Call</span>
          </Button>

          {/* Side panel toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidePanelOpen(!sidePanelOpen)}
            className="gap-1 text-gray-700 dark:text-gray-300 hover:text-[#ff6a1a] hover:bg-[#ff6a1a]/10 px-2"
            aria-label={sidePanelOpen ? "Close context panel" : "Open context panel"}
          >
            {sidePanelOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRight className="h-4 w-4" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-gray-700 dark:text-gray-300 hover:text-[#ff6a1a] hover:bg-[#ff6a1a]/10 px-2"
              >
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
        </div>
      </header>

      {/* Active mode bar */}
      <ActiveModeBar mode={activeMode} />

      {/* Voice call context banner */}
      <div className="shrink-0 max-w-4xl mx-auto w-full px-3 sm:px-4">
        <VoiceCallContextBanner
          lastDiscussedTopic={lastDiscussedTopic}
          isCallActive={callModalOpen}
          lastCallSummary={lastCallSummary}
          onDismiss={() => setLastCallSummary(null)}
        />
      </div>

      {/* Main area: Chat + Side Panel */}
      <div className="flex-1 flex min-h-0">
        {/* Chat container */}
        <main className="flex-1 min-w-0">
          <div className="h-full max-w-4xl mx-auto">
            <ChatInterface
              className="h-full"
              initialMessage={initialMessage}
              onInitialMessageConsumed={handleInitialMessageConsumed}
              onSendRef={sendMessageRef}
            />
          </div>
        </main>

        {/* Side Panel -- desktop: inline aside, mobile: Sheet overlay */}
        <ChatSidePanel
          open={sidePanelOpen}
          onOpenChange={setSidePanelOpen}
          isMobile={isMobile}
        />
      </div>

      {/* Floating buttons — Voice (prominent) + Call */}
      <div className="fixed bottom-6 right-4 md:right-6 z-40 flex flex-col gap-3 items-end">
        {/* Voice Chat — large, prominent, orange */}
        <Button
          onClick={handleVoiceClick}
          className={cn(
            "h-14 w-14 rounded-full",
            "bg-[#ff6a1a] hover:bg-[#ea580c] text-white",
            "shadow-lg shadow-[#ff6a1a]/30 hover:shadow-xl hover:shadow-[#ff6a1a]/40",
            "transition-all duration-300"
          )}
          aria-label="Voice chat with Fred"
        >
          <Mic className="h-6 w-6" />
        </Button>

        {/* Call Fred — smaller, secondary */}
        <Button
          onClick={handleCallClick}
          className={cn(
            "h-11 px-4 rounded-full",
            "bg-white dark:bg-gray-900 text-[#ff6a1a]",
            "border border-[#ff6a1a]/30",
            "hover:bg-[#ff6a1a] hover:text-white",
            "shadow-md hover:shadow-lg",
            "transition-all duration-300"
          )}
          aria-label="Call Fred"
        >
          <Phone className="h-4 w-4 mr-1.5" />
          <span className="text-xs font-medium">Call</span>
        </Button>
      </div>

      {/* Voice Chat Overlay — Whisper Flow powered */}
      <VoiceChatOverlay
        open={voiceOverlayOpen}
        onClose={() => setVoiceOverlayOpen(false)}
        onSendMessage={handleVoiceSend}
      />

      {/* Call Fred Modal — now available to all tiers */}
      <CallFredModal
        open={callModalOpen}
        onOpenChange={setCallModalOpen}
        onCallEnd={(summary) => setLastCallSummary(summary)}
      />
    </div>
  );
}
