import type { ReactNode } from "react";
import { cn } from "./cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-4",
        className
      )}
    >
      <div className="w-12 h-12 mb-4 rounded-full bg-primary-muted flex items-center justify-center text-primary text-xl">
        ∅
      </div>
      <h3 className="text-base font-medium text-text mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
