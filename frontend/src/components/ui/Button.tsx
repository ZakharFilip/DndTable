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
    "bg-primary text-white border border-primary hover:bg-primary-hover hover:shadow-[var(--ds-shadow-riso-accent)] active:translate-x-px active:translate-y-px active:shadow-none disabled:opacity-45",
  secondary:
    "bg-surface text-text border border-border hover:bg-[var(--ds-color-base-subtle)] active:shadow-[var(--ds-shadow-inset)] disabled:opacity-45",
  ghost:
    "bg-transparent text-text-secondary border border-transparent hover:bg-[var(--ds-color-base-subtle)] hover:text-text active:shadow-[var(--ds-shadow-inset)] disabled:text-text-muted",
  danger:
    "bg-error text-white border border-error hover:brightness-[0.92] active:shadow-[var(--ds-shadow-inset)] disabled:opacity-45",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-[var(--ds-radius-sm)]",
  md: "h-10 px-4 text-[length:var(--ds-text-body-size)] rounded-[var(--ds-radius-md)]",
  lg: "h-11 px-5 text-[length:var(--ds-text-body-size)] rounded-[var(--ds-radius-md)]",
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
        "inline-flex items-center justify-center gap-2 font-medium font-body",
        "transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-150 ease-[var(--ds-ease-standard)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-color-focus)] focus-visible:ring-offset-2",
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
