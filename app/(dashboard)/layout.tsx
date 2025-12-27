import React from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Telescope,
  BarChart3,
  FileText,
  Settings,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/reality-lens", label: "Reality Lens", icon: Telescope },
    { href: "/investor-score", label: "Investor Score", icon: BarChart3 },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="font-bold text-xl">FredCarey</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-background px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <span className="font-bold text-2xl">FredCarey</span>
              </Link>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navItems.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <item.icon className="h-6 w-6 shrink-0" />
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
                <li className="mt-auto">
                  <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6">
                    <UserButton afterSignOutUrl="/" />
                    <span className="sr-only">Your profile</span>
                  </div>
                </li>
              </ul>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:pl-72 w-full">
          <div className="px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
