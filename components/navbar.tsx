"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeSwitcher from "@/components/theme-switcher";
import {
  ChevronDownIcon,
  FaceIcon,
  GlobeIcon,
  OpenInNewWindowIcon,
  PersonIcon,
  TimerIcon,
  HamburgerMenuIcon,
  Cross1Icon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { name: "Pricing", href: "#pricing" },
    { name: "Testimonials", href: "#testimonials" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex sm:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="relative"
            >
              <motion.div
                animate={{ rotate: isMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {isMenuOpen ? <Cross1Icon /> : <HamburgerMenuIcon />}
              </motion.div>
            </Button>
          </div>
          <div className="flex sm:hidden">
            <Link href="/" className="font-semibold tracking-tight text-lg">
              Decision OS
            </Link>
          </div>
          <div className="hidden sm:flex items-center space-x-8">
            <Link href="/" className="font-semibold tracking-tight text-2xl">
              Decision OS
            </Link>

            <Button asChild variant="ghost" size="sm">
              <Link href="#pricing">Pricing</Link>
            </Button>

            <Button asChild variant="ghost" size="sm">
              <Link href="#testimonials">Testimonials</Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  Features
                  <ChevronDownIcon className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80">
                <DropdownMenuItem>
                  <OpenInNewWindowIcon className="mr-2 h-4 w-4" />
                  <div>
                    <div className="font-semibold">Startup Reality Lens</div>
                    <div className="text-sm text-muted-foreground">
                      Evaluate feasibility, economics, demand, distribution & timing
                      for any startup idea.
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <PersonIcon className="mr-2 h-4 w-4" />
                  <div>
                    <div className="font-semibold">Investor Readiness Score</div>
                    <div className="text-sm text-muted-foreground">
                      Know exactly where you stand and what to fix before
                      approaching investors.
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <GlobeIcon className="mr-2 h-4 w-4" />
                  <div>
                    <div className="font-semibold">Pitch Deck Review</div>
                    <div className="text-sm text-muted-foreground">
                      Get a detailed scorecard, objection list, and rewrite
                      guidance for your deck.
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <TimerIcon className="mr-2 h-4 w-4" />
                  <div>
                    <div className="font-semibold">Virtual Team Agents</div>
                    <div className="text-sm text-muted-foreground">
                      AI agents for Founder Ops, Fundraise Ops, Growth Ops,
                      and Inbox management.
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FaceIcon className="mr-2 h-4 w-4" />
                  <div>
                    <div className="font-semibold">Boardy Integration</div>
                    <div className="text-sm text-muted-foreground">
                      Investor matching, warm intros, and outreach sequencing
                      to the right funds.
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center space-x-4">
            <Button asChild className="hidden sm:flex shadow-lg" size="sm">
              <Link href="#pricing">
                Get Started Free
              </Link>
            </Button>
            <ThemeSwitcher />
          </div>
        </div>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="sm:hidden overflow-hidden"
            >
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                exit={{ y: -20 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="px-2 pt-2 pb-3 space-y-1"
              >
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                  >
                    <Link
                      href={item.href}
                      className="block px-3 py-2 text-base font-medium text-foreground hover:bg-muted rounded-md transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                  className="pt-2 mt-2"
                >
                  <Link
                    href="#pricing"
                    className="flex items-center justify-center px-3 py-2 text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Get Started Free
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
