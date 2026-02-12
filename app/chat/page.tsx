"use client";

import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ActiveModeBar, type ChatMode } from "@/components/chat/active-mode-bar";
import { ChatSidePanel } from "@/components/chat/chat-side-panel";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  MessageCircle,
  Download,
  PanelRight,
  PanelRightClose,
  Phone,
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
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";

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
  const [activeMode, setActiveMode] = useState<ChatMode>("founder-os");
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const { tier } = useUserTier();

  // Auto-collapse side panel on mobile
  useEffect(() => {
    if (isMobile && sidePanelOpen) {
      setSidePanelOpen(false);
    }
  }, [isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <MessageCircle className="h-4 w-4 text-[#ff6a1a]" />
          <h1 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
            Talk to Fred
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {/* Call Fred — Pro+ only */}
          {tier >= UserTier.PRO && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCallModalOpen(true)}
              className="gap-1 text-gray-700 dark:text-gray-300 hover:text-[#ff6a1a] hover:bg-[#ff6a1a]/10 px-2"
              aria-label="Call Fred"
            >
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Call</span>
            </Button>
          )}

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
          <Link href="/">
            <Image
              src="/sahara-logo.svg"
              alt="Sahara"
              width={80}
              height={20}
              className="h-5 w-auto opacity-70 hover:opacity-100 transition-opacity"
            />
          </Link>
        </div>
      </header>

      {/* Active mode bar */}
      <ActiveModeBar mode={activeMode} />

      {/* Main area: Chat + Side Panel */}
      <div className="flex-1 flex min-h-0">
        {/* Chat container */}
        <main className="flex-1 min-w-0">
          <div className="h-full max-w-4xl mx-auto">
            <ChatInterface className="h-full" />
          </div>
        </main>

        {/* Side Panel -- desktop: inline aside, mobile: Sheet overlay */}
        <ChatSidePanel
          open={sidePanelOpen}
          onOpenChange={setSidePanelOpen}
          isMobile={isMobile}
        />
      </div>

      {/* Call Fred Modal — Pro+ */}
      {tier >= UserTier.PRO && (
        <CallFredModal open={callModalOpen} onOpenChange={setCallModalOpen} />
      )}
    </div>
  );
}
