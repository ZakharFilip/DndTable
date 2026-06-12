import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  interactive?: boolean;
  glow?: boolean;
}

const paddingClass = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  children,
  padding = "md",
  hover = false,
  interactive = false,
  glow = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface border border-border rounded-[var(--ds-radius-lg)] shadow-card",
        paddingClass[padding],
        glow && "ui-card-glow",
        hover &&
          "transition-[box-shadow,border-color] duration-150 ease-[var(--ds-ease-standard)] hover:shadow-elevated hover:border-[var(--ds-color-structure)]",
        interactive &&
          "before:absolute before:top-0 before:left-0 before:h-0.5 before:w-[40%] before:rounded-br-sm before:bg-primary-muted before:content-['']",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
