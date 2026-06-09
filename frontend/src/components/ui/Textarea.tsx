import type { TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string | null;
}

export function Textarea({ error, className, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      <textarea
        className={cn(
          "w-full min-h-[88px] px-3 py-2 text-sm text-text bg-surface border rounded-lg resize-y",
          "placeholder:text-text-muted",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
          "disabled:opacity-50",
          error ? "border-error" : "border-border",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
