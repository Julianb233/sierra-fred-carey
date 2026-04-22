"use client";

/**
 * Public Invite Landing Page
 * AI-8502: Co-founder invite + join flow
 *
 * When a co-founder receives an invite email and clicks the link,
 * they land here. Shows invite details and CTAs to sign up or log in.
 * After auth, redirects to /dashboard/invitations to accept.
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Loader2, ArrowRight, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// ============================================================================
// Types
// ============================================================================

interface InviteData {
  id: string;
  status: string;
  role: string;
  invited_at: string;
  inviter_name: string;
  inviter_company?: string;
}

type PageState = "loading" | "loaded" | "not_found" | "expired" | "accepted" | "error";

// ============================================================================
// Page
// ============================================================================

export default function InviteLandingPage() {
  const params = useParams();
  const router = useRouter();
  const inviteId = params.id as string;
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth status and fetch invite data
  useEffect(() => {
    async function init() {
      // Check if user is already logged in
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      // If authenticated, redirect directly to invitations page
      if (user) {
        router.push("/dashboard/invitations");
        return;
      }

      // Fetch invite data
      try {
        const res = await fetch(`/api/invite/${inviteId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setPageState("not_found");
          return;
        }

        setInvite(data.invite);

        if (data.invite.status === "revoked") {
          setPageState("expired");
        } else if (data.invite.status === "active") {
          setPageState("accepted");
        } else {
          setPageState("loaded");
        }
      } catch {
        setPageState("error");
      }
    }

    init();
  }, [inviteId, router]);

  // Loading
  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  // Not found
  if (pageState === "not_found" || pageState === "error") {
    return (
      <CenteredCard>
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Invitation Not Found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          This invitation link is invalid or has been removed. Please ask the person who invited you to send a new link.
        </p>
        <Link href="/login">
          <Button className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
            Go to Sahara
          </Button>
        </Link>
      </CenteredCard>
    );
  }

  // Expired/revoked
  if (pageState === "expired") {
    return (
      <CenteredCard>
        <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Invitation Expired
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          This invitation has been revoked or is no longer valid. Please ask{" "}
          {invite?.inviter_name || "the team owner"} to send a new invitation.
        </p>
        <Link href="/login">
          <Button className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
            Go to Sahara
          </Button>
        </Link>
      </CenteredCard>
    );
  }

  // Already accepted
  if (pageState === "accepted") {
    return (
      <CenteredCard>
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Already Accepted
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          This invitation has already been accepted. Log in to access the team.
        </p>
        <Link href="/login">
          <Button className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
            Log In
          </Button>
        </Link>
      </CenteredCard>
    );
  }

  // Valid invite — show details and CTAs
  const roleLabel = invite?.role
    ? invite.role.charAt(0).toUpperCase() + invite.role.slice(1)
    : "Member";

  const redirectUrl = `/dashboard/invitations`;
  const signupUrl = `/signup`;
  const loginUrl = `/login?redirect=${encodeURIComponent(redirectUrl)}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Sahara branding */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-[#ff6a1a] to-orange-500 bg-clip-text text-transparent">
            Sahara
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            AI-Powered Founder Operating System
          </p>
        </div>

        {/* Invite card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Orange header */}
          <div className="bg-gradient-to-r from-[#ff6a1a] to-[#ea580c] p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20 mb-3">
              <Users className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">
              You&apos;re Invited to Collaborate
            </h1>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            <div className="text-center">
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {invite?.inviter_name}
                </span>{" "}
                has invited you to join their startup team as a{" "}
                <span className="font-semibold text-[#ff6a1a]">{roleLabel}</span>.
              </p>
              {invite?.inviter_company && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Company: {invite.inviter_company}
                </p>
              )}
            </div>

            {/* Role description */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {invite?.role === "collaborator"
                  ? "As a Collaborator, you can view and contribute to the startup journey, including progress tracking, insights, and shared documents."
                  : invite?.role === "admin"
                    ? "As an Admin, you have full access to manage the startup journey alongside the founder."
                    : "As a Viewer, you can follow the startup journey and view shared progress, insights, and documents."}
              </p>
            </div>

            {/* CTAs */}
            <div className="space-y-3 pt-2">
              <Link href={signupUrl} className="block">
                <Button className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white h-12 text-base">
                  Create Account & Join
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href={loginUrl} className="block">
                <Button variant="outline" className="w-full h-12 text-base">
                  I Already Have an Account
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          After signing in, you&apos;ll be taken to your invitations page to accept.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
        {children}
      </div>
    </div>
  );
}
