
import React from "react";
import { cn } from "@/lib/utils";

// Section container for better organization
export const Section = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <section 
      className={cn("py-8 px-4 md:px-6 transition-all duration-300 animate-fade-in", className)} 
      {...props}
    >
      {children}
    </section>
  );
};

// Glass container with blur effect
export const GlassContainer = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div 
      className={cn("glass-effect rounded-xl p-6", className)} 
      {...props}
    >
      {children}
    </div>
  );
};

// Card with hover effect
export const HoverCard = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div 
      className={cn("bg-card rounded-xl p-6 card-hover", className)} 
      {...props}
    >
      {children}
    </div>
  );
};

// Heading with optional badge
interface HeadingProps {
  children: React.ReactNode;
  badge?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export const Heading = ({
  children,
  badge,
  level = 2,
  className,
  ...props
}: HeadingProps) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  
  return (
    <div className="flex items-center gap-2 mb-4">
      <Tag 
        className={cn(
          "font-medium tracking-tight",
          level === 1 && "text-3xl md:text-4xl",
          level === 2 && "text-2xl md:text-3xl",
          level === 3 && "text-xl md:text-2xl",
          level === 4 && "text-lg md:text-xl",
          level === 5 && "text-base md:text-lg",
          level === 6 && "text-sm md:text-base",
          className
        )} 
      >
        {children}
      </Tag>
      
      {badge && (
        <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full">
          {badge}
        </span>
      )}
    </div>
  );
};

// Simple grid layout
interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: number;
  gap?: number;
}

export const Grid = ({
  children,
  cols = 2,
  gap = 4,
  className,
  ...props
}: GridProps) => {
  return (
    <div 
      className={cn(
        "grid",
        `grid-cols-1 md:grid-cols-${cols}`,
        `gap-${gap}`,
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
};

// Value display component
interface ValueDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  suffix?: string;
  highlight?: boolean;
}

export const ValueDisplay = ({
  label,
  value,
  suffix,
  highlight = false,
  className,
  ...props
}: ValueDisplayProps) => {
  return (
    <div 
      className={cn(
        "p-3 rounded-lg",
        highlight ? "bg-primary/10" : "bg-card", 
        className
      )} 
      {...props}
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn("font-medium", highlight && "text-primary")}>
        {value}{suffix && <span className="text-sm font-normal ml-1">{suffix}</span>}
      </p>
    </div>
  );
};
