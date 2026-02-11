import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { LogoutButton } from "./components/LogoutButton";
import { isAdminSession } from "@/lib/auth/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdminSession();

  if (!admin) {
    // Check if we're already on the login page to avoid infinite redirect loop.
    // The middleware sets x-pathname on every request for server components to read.
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") || "";
    const isLoginPage = pathname === "/admin/login";

    if (!isLoginPage) {
      redirect("/admin/login");
    }

    // On the login page — render children without the admin nav chrome
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
    );
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
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  );
}
