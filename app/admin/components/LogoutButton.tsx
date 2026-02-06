"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const res = await fetch("/api/admin/logout", { method: "POST" });
    const data = await res.json();
    if (data.redirect) {
      router.push(data.redirect);
    }
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
