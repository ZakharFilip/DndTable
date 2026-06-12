import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  error?: string | null;
}

export function Checkbox({ label, error, className, id, ...props }: CheckboxProps) {
  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className={cn("flex items-start gap-2.5 cursor-pointer select-none", className)}
      >
        <input
          id={id}
          type="checkbox"
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 rounded-[var(--ds-radius-sm)] border border-border bg-surface",
            "text-primary accent-[var(--ds-color-accent)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-color-focus)] focus-visible:ring-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-error"
          )}
          {...props}
        />
        {label != null && (
          <span className="text-sm text-text-secondary leading-snug">{label}</span>
        )}
      </label>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
