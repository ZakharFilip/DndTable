import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  required?: boolean;
}

export function Label({ children, required, className, ...props }: LabelProps) {
  return (
    <label
      className={cn("block text-sm font-medium text-text-secondary mb-1", className)}
      {...props}
    >
      {children}
      {required && <span className="text-error ml-0.5">*</span>}
    </label>
  );
}
