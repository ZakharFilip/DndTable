import * as ContextMenu from "@radix-ui/react-context-menu";
import type { ReactNode } from "react";

interface TableContextMenuProps {
  trigger: ReactNode;
  onOpenChange: (open: boolean) => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
}

export function TableContextMenu({
  trigger,
  onOpenChange,
  onCopy,
  onPaste,
  onDelete,
}: TableContextMenuProps) {
  return (
    <ContextMenu.Root onOpenChange={onOpenChange}>
      <ContextMenu.Trigger asChild>{trigger}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="z-[70] min-w-[180px] rounded-md border border-gray-200 bg-white shadow-lg p-1"
          alignOffset={4}
        >
          <ContextMenu.Item
            className="select-none rounded px-3 py-2 text-sm outline-none hover:bg-gray-50 focus:bg-gray-50"
            onSelect={(e) => {
              e.preventDefault();
              onCopy();
            }}
          >
            Копировать
          </ContextMenu.Item>
          <ContextMenu.Item
            className="select-none rounded px-3 py-2 text-sm outline-none hover:bg-gray-50 focus:bg-gray-50"
            onSelect={(e) => {
              e.preventDefault();
              onPaste();
            }}
          >
            Вставить
          </ContextMenu.Item>
          <ContextMenu.Separator className="my-1 h-px bg-gray-200" />
          <ContextMenu.Item
            className="select-none rounded px-3 py-2 text-sm outline-none hover:bg-gray-50 focus:bg-gray-50"
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
