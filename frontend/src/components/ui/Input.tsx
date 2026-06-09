import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string | null;
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      <input
        className={cn(
          "w-full h-10 px-3 text-sm text-text bg-surface border rounded-lg",
          "placeholder:text-text-muted",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error ? "border-error" : "border-border",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
