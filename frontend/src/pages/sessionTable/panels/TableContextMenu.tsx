import * as ContextMenu from "@radix-ui/react-context-menu";
import type { ReactNode } from "react";
import { cn } from "../../../components/ui/cn";

interface TableContextMenuProps {
  trigger: ReactNode;
  showEdit: boolean;
  onOpenChange: (open: boolean) => void;
  onCopy: () => void;
  onPaste: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}

const itemClass = cn(
  "select-none rounded-[var(--ds-radius-sm)] px-3 py-2.5 text-sm outline-none",
  "text-text transition-colors duration-150",
  "hover:bg-[var(--ds-color-base-subtle)] focus:bg-[var(--ds-color-focus-muted)]",
  "focus:border-l-2 focus:border-l-[var(--ds-color-focus)] focus:pl-[calc(0.75rem-2px)]"
);

export function TableContextMenu({
  trigger,
  showEdit,
  onOpenChange,
  onCopy,
  onPaste,
  onEdit,
  onDelete,
}: TableContextMenuProps) {
  return (
    <ContextMenu.Root onOpenChange={onOpenChange}>
      <ContextMenu.Trigger asChild>{trigger}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className={cn(
            "z-[70] min-w-[180px] rounded-[var(--ds-radius-md)] border border-border p-1",
            "bg-[var(--ds-color-surface-raised)] shadow-elevated ds-scale-in"
          )}
          alignOffset={4}
        >
          <ContextMenu.Item
            className={itemClass}
            onSelect={(e) => {
              e.preventDefault();
              onCopy();
            }}
          >
            Копировать
          </ContextMenu.Item>
          <ContextMenu.Item
            className={itemClass}
            onSelect={(e) => {
              e.preventDefault();
              onPaste();
            }}
          >
            Вставить
          </ContextMenu.Item>
          {showEdit && onEdit && (
            <ContextMenu.Item
              className={itemClass}
              onSelect={(e) => {
                e.preventDefault();
                onEdit();
              }}
            >
              Редактировать
            </ContextMenu.Item>
          )}
          <ContextMenu.Separator className="my-1 h-px bg-border" />
          <ContextMenu.Item
            className={cn(
              itemClass,
              "text-error hover:bg-error-muted focus:bg-error-muted"
            )}
            onSelect={(e) => {
              e.preventDefault();
              onDelete();
            }}
          >
            Удалить
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
