import type { ReactNode } from "react";
import { cn } from "./cn";
import { Card } from "./Card";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <Card
        className={cn("w-full max-w-md modal-content", className)}
        padding="none"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <button
            type="button"
            className="text-sm text-text-secondary hover:text-text"
            onClick={onClose}
          >
            Закрыть
          </button>
        </header>
        <div className="px-4 py-4">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 px-4 py-3 border-t border-border">
            {footer}
          </footer>
        )}
      </Card>
    </div>
  );
}
