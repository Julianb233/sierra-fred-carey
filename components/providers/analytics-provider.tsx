"use client";

/**
 * Analytics Provider Component
 *
 * Phase 30-01: Wraps the app with PostHog analytics context.
 * Initializes analytics on mount, auto-identifies users from Supabase,
 * and tracks page views on route changes.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { initAnalytics, identifyUser, trackEvent, resetUser } from "@/lib/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPathname = useRef<string | null>(null);
  const identifiedRef = useRef(false);

  // Initialize analytics and identify user on mount
  useEffect(() => {
    initAnalytics();

    // Auto-identify user from Supabase session
    const identifyFromSession = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          identifyUser(session.user.id, {
            email: session.user.email,
            created_at: session.user.created_at,
          });
          identifiedRef.current = true;
        }

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (_event, newSession) => {
            if (newSession?.user && !identifiedRef.current) {
              identifyUser(newSession.user.id, {
                email: newSession.user.email,
                created_at: newSession.user.created_at,
              });
              identifiedRef.current = true;
            } else if (!newSession && identifiedRef.current) {
              trackEvent(ANALYTICS_EVENTS.AUTH.LOGOUT);
              resetUser();
              identifiedRef.current = false;
            }
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch {
        // Non-critical: analytics identification failed silently
      }
    };

    identifyFromSession();
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (pathname && pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      trackEvent(ANALYTICS_EVENTS.ENGAGEMENT.DASHBOARD_VIEWED, {
        page: pathname,
      });
    }
  }, [pathname]);

  return <>{children}</>;
}
