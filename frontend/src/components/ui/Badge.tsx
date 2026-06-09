import type { ReactNode } from "react";
import { cn } from "./cn";

type Variant = "default" | "primary" | "success" | "warning" | "error";

interface BadgeProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

const variantClass: Record<Variant, string> = {
  default: "bg-background text-text-secondary border-border",
  primary: "bg-primary-muted text-primary border-primary/20",
  success: "bg-success-muted text-success border-success/20",
  warning: "bg-warning-muted text-warning border-warning/20",
  error: "bg-error-muted text-error border-error/20",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border",
        variantClass[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
