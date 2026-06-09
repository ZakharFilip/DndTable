import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
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
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-xl shadow-card",
        paddingClass[padding],
        hover && "transition-shadow duration-150 hover:shadow-elevated",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
