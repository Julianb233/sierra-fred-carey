"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import ThemeSwitcher from "@/components/theme-switcher";
import {
  ChevronDownIcon,
  FaceIcon,
  GlobeIcon,
  OpenInNewWindowIcon,
  PersonIcon,
  TimerIcon,
  HamburgerMenuIcon,
  RocketIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const menuItems = [
    { name: "Pricing", href: "/pricing" },
    { name: "Features", href: "#features" },
    { name: "About", href: "/about" },
    { name: "Agents", href: "/agents" },
  ];

  const featureItems = [
    {
      icon: <OpenInNewWindowIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />,
      title: "Startup Reality Lens",
      description: "Evaluate feasibility, economics, demand, distribution & timing for any startup idea.",
      gradient: "from-[#ff6a1a] to-orange-400",
      href: "/demo/reality-lens",
    },
    {
      icon: <PersonIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />,
      title: "Investor Readiness Score",
      description: "Know exactly where you stand and what to fix before approaching investors.",
      gradient: "from-amber-500 to-[#ff6a1a]",
      href: "/demo/investor-lens",
    },
    {
      icon: <GlobeIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />,
      title: "Pitch Deck Review",
      description: "Get a detailed scorecard, objection list, and rewrite guidance for your deck.",
      gradient: "from-orange-500 to-red-500",
      href: "/demo/pitch-deck",
    },
    {
      icon: <TimerIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />,
      title: "Virtual Team Agents",
      description: "AI agents for Founder Ops, Fundraise Ops, Growth Ops, and Inbox management.",
      gradient: "from-[#ff6a1a] to-amber-400",
      href: "/demo/virtual-team",
    },
    {
      icon: <FaceIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />,
      title: "Boardy Integration",
      description: "Investor matching, warm intros, and outreach sequencing to the right funds.",
      gradient: "from-orange-600 to-[#ff6a1a]",
      href: "/demo/boardy",
    }
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-lg shadow-black/5"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Mobile Menu Button - Left */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden touch-target bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <HamburgerMenuIcon className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[350px] bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
              <SheetHeader>
                <SheetTitle className="text-[#ff6a1a] text-xl font-bold">Decision OS</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-8">
                {menuItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-3 text-base font-medium rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 transition-all touch-target text-gray-900 dark:text-white"
                  >
                    {item.name}
                  </Link>
                ))}

                <Separator className="my-2 bg-gray-200 dark:bg-gray-800" />

                <div className="px-2">
                  <p className="text-sm font-semibold text-[#ff6a1a] mb-3 px-2">Features</p>
                  <div className="flex flex-col gap-2">
                    {featureItems.map((feature) => (
                      <Link
                        key={feature.title}
                        href={feature.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 transition-all touch-target"
                      >
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${feature.gradient}`}>
                          {feature.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-white">{feature.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {feature.description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <Separator className="my-2 bg-gray-200 dark:bg-gray-800" />

                <Button asChild variant="outline" size="lg" className="w-full touch-target border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/10 hover:border-[#ff6a1a]">
                  <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                    Login
                  </Link>
                </Button>

                <Button asChild size="lg" className="w-full touch-target bg-[#ff6a1a] hover:bg-[#ea580c] text-white border-0 shadow-lg shadow-[#ff6a1a]/25">
                  <Link href="/get-started" onClick={() => setIsMenuOpen(false)}>
                    Get Started Free
                    <RocketIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo - Center on mobile, left on desktop */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 lg:relative lg:left-0 lg:translate-x-0 group"
          >
            <span className="font-bold tracking-tight text-lg sm:text-xl lg:text-2xl text-[#ff6a1a] group-hover:opacity-80 transition-opacity">
              Decision OS
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-2">
            {menuItems.slice(0, 2).map((item) => (
              <Button key={item.name} asChild variant="ghost" size="sm" className="touch-target hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all">
                <Link href={item.href}>{item.name}</Link>
              </Button>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="touch-target hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all">
                  Features
                  <ChevronDownIcon className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 p-2" align="end">
                {featureItems.map((feature) => (
                  <DropdownMenuItem key={feature.title} asChild>
                    <Link href={feature.href} className="cursor-pointer rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 p-3 focus:bg-gray-100 dark:focus:bg-gray-800 flex items-start">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${feature.gradient} mr-3`}>
                        {feature.icon}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{feature.title}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {feature.description}
                        </div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {menuItems.slice(2).map((item) => (
              <Button key={item.name} asChild variant="ghost" size="sm" className="touch-target hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all">
                <Link href={item.href}>{item.name}</Link>
              </Button>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Button
              asChild
              variant="outline"
              className="hidden sm:flex border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/10 hover:border-[#ff6a1a] transition-all duration-300 touch-target"
              size="sm"
            >
              <Link href="/dashboard">
                Login
              </Link>
            </Button>
            <Button
              asChild
              className="hidden sm:flex bg-[#ff6a1a] hover:bg-[#ea580c] text-white border-0 shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40 transition-all duration-300 touch-target"
              size="sm"
            >
              <Link href="/get-started">
                Get Started Free
                <RocketIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </div>

      {/* Animated underline */}
      <AnimatePresence>
        {scrolled && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff6a1a]/50 to-transparent"
          />
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
