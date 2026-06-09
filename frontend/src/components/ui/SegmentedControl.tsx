import { cn } from "./cn";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex p-1 bg-background border border-border rounded-lg",
        className
      )}
      role="tablist"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150",
            value === opt.value
              ? "bg-surface text-text shadow-card"
              : "text-text-secondary hover:text-text"
          )}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
