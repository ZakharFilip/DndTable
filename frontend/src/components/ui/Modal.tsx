import type { ReactNode } from "react";
import { cn } from "./cn";
import { Card } from "./Card";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, subtitle, children, footer, className }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 ds-fade-in"
      style={{
        background: "var(--ds-color-overlay)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
      role="presentation"
    >
      <Card
        className={cn(
          "w-full max-w-md ds-scale-in bg-[var(--ds-color-surface-raised)] shadow-elevated",
          className
        )}
        padding="none"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            {subtitle && (
              <p className="text-[length:var(--ds-text-label-size)] font-semibold uppercase tracking-[var(--ds-text-label-tracking)] text-text-muted">
                {subtitle}
              </p>
            )}
            <h2 className="font-display text-[length:var(--ds-text-title-size)] font-semibold text-text">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="text-sm text-text-secondary hover:text-text transition-colors duration-150 rounded-[var(--ds-radius-sm)] px-2 py-1 hover:bg-[var(--ds-color-base-subtle)]"
            onClick={onClose}
          >
            Закрыть
          </button>
        </header>
        <div className="px-4 py-4 text-[length:var(--ds-text-body-size)]">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 px-4 py-3 border-t border-border">
            {footer}
          </footer>
        )}
      </Card>
    </div>
  );
}
