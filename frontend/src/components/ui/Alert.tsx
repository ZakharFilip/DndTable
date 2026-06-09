import type { ReactNode } from "react";
import { cn } from "./cn";

type Variant = "info" | "error" | "success" | "warning";

interface AlertProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

const variantClass: Record<Variant, string> = {
  info: "bg-primary-muted text-text border-primary/20",
  error: "bg-error-muted text-error border-error/20",
  success: "bg-success-muted text-success border-success/20",
  warning: "bg-warning-muted text-warning border-warning/20",
};

export function Alert({ children, variant = "info", className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "px-3 py-2.5 text-sm rounded-lg border",
        variantClass[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
