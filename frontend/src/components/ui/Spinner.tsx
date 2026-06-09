import { cn } from "./cn";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClass = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Загрузка"
      className={cn(
        "inline-block animate-spin rounded-full border-border border-t-primary",
        sizeClass[size],
        className
      )}
    />
  );
}
