"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useState } from "react";

interface MobileNavProps {
  menuItems: Array<{ name: string; href: string }>;
  featuresItems?: Array<{ 
    icon: React.ReactNode; 
    title: string; 
    description: string; 
  }>;
}

export function MobileNav({ menuItems, featuresItems }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <HamburgerMenuIcon className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-8">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-lg font-medium rounded-lg hover:bg-muted transition-colors"
            >
              {item.name}
            </Link>
          ))}
          
          {featuresItems && featuresItems.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="px-4 py-2">
                <p className="text-sm font-semibold text-muted-foreground mb-3">Features</p>
                <div className="flex flex-col gap-3">
                  {featuresItems.map((feature) => (
                    <div key={feature.title} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="mt-1">{feature.icon}</div>
                      <div>
                        <p className="font-medium text-sm">{feature.title}</p>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          <Separator className="my-2" />
          
          <Button asChild size="lg" className="w-full">
            <Link href="#pricing" onClick={() => setOpen(false)}>
              Get Started Free
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
