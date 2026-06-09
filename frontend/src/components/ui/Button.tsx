import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-primary text-white border border-primary hover:bg-primary-hover disabled:opacity-50",
  secondary:
    "bg-surface text-text border border-border hover:bg-background disabled:opacity-50",
  ghost: "bg-transparent text-text-secondary border border-transparent hover:bg-background hover:text-text",
  danger:
    "bg-error text-white border border-error hover:opacity-90 disabled:opacity-50",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-md",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-11 px-5 text-base rounded-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner size="sm" className="border-white/30 border-t-white" />}
      {children}
    </button>
  );
}
