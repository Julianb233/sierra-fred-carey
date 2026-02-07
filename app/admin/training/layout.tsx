"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Overview", href: "/admin/training" },
  { label: "Communication Style", href: "/admin/training/communication" },
  { label: "Frameworks", href: "/admin/training/frameworks" },
  { label: "Agent Behavior", href: "/admin/training/agents" },
  { label: "Identity & Background", href: "/admin/training/identity" },
];

export default function TrainingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar */}
      <aside className="w-full md:w-60 shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Training Docs
        </h2>
        <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin/training"
                ? pathname === "/admin/training"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "text-[#ff6a1a] bg-orange-50 dark:bg-orange-950/30 border-l-2 md:border-l-2 border-[#ff6a1a]"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 max-w-4xl">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          {children}
        </div>
      </div>
    </div>
  );
}
