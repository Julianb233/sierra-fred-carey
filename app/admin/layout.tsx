import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/auth/admin";
import { LogoutButton } from "./components/LogoutButton";

// Admin routes read cookies() via the Supabase server client for the
// role check in isAdminSession(), which is incompatible with static
// rendering. Mark the whole segment dynamic to avoid build-time
// "Dynamic server usage" errors on every /admin/* page.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminSession())) {
    redirect("/login?redirect=/admin");
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Admin Panel
              </h1>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                AI Settings Management
              </span>
            </div>
            <LogoutButton />
          </div>

          <div className="flex gap-2">
            <Link
              href="/admin"
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/users"
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Users
            </Link>
            <Link
              href="/admin/prompts"
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Prompts
            </Link>
            <Link
              href="/admin/config"
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Config
            </Link>
            <Link
              href="/admin/ab-tests"
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              A/B Tests
            </Link>
            <Link
              href="/admin/training"
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Training
            </Link>
            <Link
              href="/admin/voice-agent"
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Voice Agent
            </Link>
            <Link
              href="/admin/analytics"
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Analytics
            </Link>
            <Link
              href="/admin/feedback"
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Feedback
            </Link>
            <Link
              href="/admin/testing"
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Testing
            </Link>
            <Link
              href="/admin/prompt-patches"
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              RLHF
            </Link>
            <Link
              href="/admin/sentiment"
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Sentiment
            </Link>
            <Link
              href="/admin/audit-log"
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Audit Log
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  );
}
