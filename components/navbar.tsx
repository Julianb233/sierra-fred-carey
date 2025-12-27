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
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useState } from "react";

export default function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { name: "Pricing", href: "#pricing" },
    { name: "Testimonials", href: "#testimonials" },
  ];

  const featureItems = [
    {
      icon: <OpenInNewWindowIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />,
      title: "Startup Reality Lens",
      description: "Evaluate feasibility, economics, demand, distribution & timing for any startup idea."
    },
    {
      icon: <PersonIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />,
      title: "Investor Readiness Score",
      description: "Know exactly where you stand and what to fix before approaching investors."
    },
    {
      icon: <GlobeIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />,
      title: "Pitch Deck Review",
      description: "Get a detailed scorecard, objection list, and rewrite guidance for your deck."
    },
    {
      icon: <TimerIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />,
      title: "Virtual Team Agents",
      description: "AI agents for Founder Ops, Fundraise Ops, Growth Ops, and Inbox management."
    },
    {
      icon: <FaceIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />,
      title: "Boardy Integration",
      description: "Investor matching, warm intros, and outreach sequencing to the right funds."
    }
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile Menu Button - Left */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden touch-target">
                <HamburgerMenuIcon className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[350px]">
              <SheetHeader>
                <SheetTitle>Decision OS</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-8">
                {menuItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-3 text-base font-medium rounded-lg hover:bg-muted transition-colors touch-target"
                  >
                    {item.name}
                  </Link>
                ))}
                
                <Separator className="my-2" />
                
                <div className="px-2">
                  <p className="text-sm font-semibold text-muted-foreground mb-3 px-2">Features</p>
                  <div className="flex flex-col gap-2">
                    {featureItems.map((feature) => (
                      <div 
                        key={feature.title} 
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors touch-target"
                      >
                        {feature.icon}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{feature.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator className="my-2" />
                
                <Button asChild size="lg" className="w-full touch-target">
                  <Link href="#pricing" onClick={() => setIsMenuOpen(false)}>
                    Get Started Free
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo - Center on mobile, left on desktop */}
          <Link 
            href="/" 
            className="font-semibold tracking-tight text-lg sm:text-xl lg:text-2xl absolute left-1/2 -translate-x-1/2 lg:relative lg:left-0 lg:translate-x-0"
          >
            Decision OS
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-2">
            <Button asChild variant="ghost" size="sm" className="touch-target">
              <Link href="#pricing">Pricing</Link>
            </Button>

            <Button asChild variant="ghost" size="sm" className="touch-target">
              <Link href="#testimonials">Testimonials</Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="touch-target">
                  Features
                  <ChevronDownIcon className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="end">
                {featureItems.map((feature) => (
                  <DropdownMenuItem key={feature.title} className="cursor-pointer">
                    {feature.icon}
                    <div className="ml-2">
                      <div className="font-semibold">{feature.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {feature.description}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Button asChild className="hidden sm:flex shadow-lg touch-target" size="sm">
              <Link href="#pricing">
                Get Started Free
              </Link>
            </Button>
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
}
