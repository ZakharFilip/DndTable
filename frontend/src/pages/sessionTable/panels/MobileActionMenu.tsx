import { useEffect, useRef } from "react";
import { TableActionMenuContent } from "./TableActionMenuContent";

export type MobileMenuState = {
  open: boolean;
  x: number;
  y: number;
};

interface MobileActionMenuProps {
  menu: MobileMenuState;
  showEdit: boolean;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}

export function MobileActionMenu({
  menu,
  showEdit,
  onClose,
  onCopy,
  onPaste,
  onEdit,
  onDelete,
}: MobileActionMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu.open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [menu.open, onClose]);

  if (!menu.open) return null;

  const pad = 8;
  const maxX = typeof window !== "undefined" ? window.innerWidth - 200 - pad : menu.x;
  const maxY = typeof window !== "undefined" ? window.innerHeight - 180 - pad : menu.y;
  const left = Math.min(Math.max(pad, menu.x), maxX);
  const top = Math.min(Math.max(pad, menu.y), maxY);

  return (
    <div
      ref={ref}
      className="st-mobile-action-menu"
      style={{ left, top }}
      role="menu"
    >
      <TableActionMenuContent
        showEdit={showEdit}
        onCopy={() => {
          onCopy();
          onClose();
        }}
        onPaste={() => {
          onPaste();
          onClose();
        }}
        onEdit={
          onEdit
            ? () => {
                onEdit();
                onClose();
              }
            : undefined
        }
        onDelete={() => {
          onDelete();
          onClose();
        }}
      />
    </div>
  );
}
