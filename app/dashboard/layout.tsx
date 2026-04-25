"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { UserTier } from "@/lib/constants";
import { useTier } from "@/lib/context/tier-context";
import { createClient } from "@/lib/supabase/client";
import { FloatingChatWidget } from "@/components/chat/floating-chat-widget";
import { CallFredModal } from "@/components/dashboard/call-fred-modal";
import { HowToUseSaharaModal } from "@/components/dashboard/how-to-use-sahara-modal";
import { DashboardGuidedTour } from "@/components/dashboard/dashboard-guided-tour";
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav";
import { PageTransition } from "@/components/animations/PageTransition";
import { VoiceChatOverlay } from "@/components/chat/voice-chat-overlay";
import { FloatingVoiceFab } from "@/components/voice/floating-voice-fab";
import { EventFeedbackWidget } from "@/components/event-feedback-widget";
import { EventMicroSurvey } from "@/components/event-micro-survey";
import { BugReportWidget } from "@/components/bug-report-widget";
import {
  SidebarContent,
  computeVisibleNavItems,
} from "@/components/dashboard/sidebar-content";

// ============================================================================
// Layout Component
// ============================================================================

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [howToUseOpen, setHowToUseOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { tier, isLoading: isTierLoading, refresh: refreshTier } = useTier();
  const handleCallFred = useCallback(() => setCallModalOpen(true), []);
  const handleHowToUse = useCallback(() => setHowToUseOpen(true), []);

  // Listen for fred:voice custom event from MobileBottomNav
  useEffect(() => {
    const handleVoiceEvent = () => setVoiceOverlayOpen(true);
    window.addEventListener("fred:voice", handleVoiceEvent);
    return () => window.removeEventListener("fred:voice", handleVoiceEvent);
  }, []);

  // When voice overlay produces transcribed text, navigate to chat with it
  const handleVoiceSend = useCallback(
    (text: string) => {
      router.push(`/chat?message=${encodeURIComponent(text)}`);
    },
    [router]
  );
  const [userInfo, setUserInfo] = useState<{
    name: string;
    email: string;
    stage: string | null;
  } | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, stage")
        .eq("id", authUser.id)
        .single();
      setUserInfo({
        name: profile?.name || authUser.email?.split("@")[0] || "Founder",
        email: authUser.email || "",
        stage: profile?.stage ?? null,
      });
      setIsAuthChecking(false);
      // Re-fetch tier now that auth session is confirmed — the initial
      // fetch may have raced with session setup and returned FREE.
      refreshTier();
    }
    fetchUser();
  }, [router, refreshTier]);

  const user = {
    name: userInfo?.name || "",
    email: userInfo?.email || "",
    tier,
    stage: userInfo?.stage ?? null,
  };

  // Build final nav item list using shared helper
  const visibleNavItems = useMemo(
    () => computeVisibleNavItems(user.stage, tier),
    [user.stage, tier]
  );

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div role="status" aria-label="Loading" className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff6a1a]">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen">
        {/* Mobile Sidebar (hamburger drawer — hidden on md+, supplements bottom nav for full menu) */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[280px] sm:w-72">
            <SidebarContent
              user={user}
              visibleNavItems={visibleNavItems}
              pathname={pathname}
              isTierLoading={isTierLoading}
              onNavClick={closeSidebar}
              onHowToUse={handleHowToUse}
            />
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0">
          <SidebarContent
            user={user}
            visibleNavItems={visibleNavItems}
            pathname={pathname}
            isTierLoading={isTierLoading}
            onHowToUse={handleHowToUse}
          />
        </aside>

        {/* Main Content — extra bottom padding on mobile for bottom nav */}
        <main id="main-content" role="main" className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-4 lg:py-6 pb-28 md:pb-8">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </main>
      </div>

      {/* Phase 46: Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Floating Chat Widget — available on all dashboard pages including mobile */}
      <FloatingChatWidget onCallFred={tier >= UserTier.PRO ? handleCallFred : undefined} />

      {/* Floating Voice FAB — desktop only, prominent voice entry point */}
      <div className="hidden md:block">
        <FloatingVoiceFab onClick={() => setVoiceOverlayOpen(true)} />
      </div>

      {/* Phase 42: Call Fred Modal — Pro+ only */}
      <CallFredModal open={callModalOpen} onOpenChange={setCallModalOpen} />

      {/* AI-4104: How To Use Sahara — Loom walkthrough video */}
      <HowToUseSaharaModal open={howToUseOpen} onOpenChange={setHowToUseOpen} />

      {/* AI-8653: Dashboard guided tour — 5-slide overlay launched from
          the "Start a Guided Tour with Fred" CTA in the How-To-Use modal.
          Replaces the previous CTA which dumped users into chat with a
          pre-seeded message that returned a fallback response. */}
      <DashboardGuidedTour />

      {/* Voice Chat Overlay — available from mobile bottom nav and dashboard voice buttons */}
      <VoiceChatOverlay
        open={voiceOverlayOpen}
        onClose={() => setVoiceOverlayOpen(false)}
        onSendMessage={handleVoiceSend}
      />

      {/* AI-1804: Event feedback collection for first 200 attendees */}
      {/* AI-8499: Bug report widget -- all authenticated users */}
      <BugReportWidget />

      <EventFeedbackWidget />
      <EventMicroSurvey />
    </div>
  );
}
