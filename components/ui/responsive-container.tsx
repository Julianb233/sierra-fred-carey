import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const sizeClasses = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  xl: "max-w-[1400px]",
  full: "max-w-full",
};

export function ResponsiveContainer({ 
  children, 
  className, 
  size = "lg" 
}: ResponsiveContainerProps) {
  return (
    <div className={cn(
      "mx-auto w-full px-4 sm:px-6 lg:px-8",
      sizeClasses[size],
      className
    )}>
      {children}
    </div>
  );
}

export function ResponsiveSection({ 
  children, 
  className,
  containerSize = "lg",
  noPadding = false,
}: {
  children: ReactNode;
  className?: string;
  containerSize?: "sm" | "md" | "lg" | "xl" | "full";
  noPadding?: boolean;
}) {
  return (
    <section className={cn(
      !noPadding && "py-12 sm:py-16 md:py-20 lg:py-24",
      className
    )}>
      <ResponsiveContainer size={containerSize}>
        {children}
      </ResponsiveContainer>
    </section>
  );
}
