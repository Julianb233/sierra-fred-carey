"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch (err) {
      console.error("[admin/logout] legacy cookie clear failed:", err);
    }
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("[admin/logout] auth logout POST failed:", err);
    }
    try {
      await createClient().auth.signOut();
    } catch (err) {
      console.error("[admin/logout] client signOut failed:", err);
    }
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      Logout
    </button>
  );
}
