import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Simple admin check - can be enhanced later
async function isAdmin() {
  const cookieStore = await cookies();
  const adminKey = cookieStore.get("adminKey")?.value;
  return adminKey === process.env.ADMIN_SECRET_KEY;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin/login");
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
            <form action="/api/admin/logout" method="POST">
              <button
                type="submit"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Logout
              </button>
            </form>
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
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  );
}
