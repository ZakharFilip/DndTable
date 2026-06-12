import { cn } from "../../../components/ui/cn";

interface TableActionMenuContentProps {
  showEdit: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  className?: string;
}

const itemClass = cn(
  "block w-full text-left px-3 py-2.5 text-sm rounded-[var(--ds-radius-sm)]",
  "text-text border-l-2 border-transparent transition-colors duration-150",
  "hover:bg-[var(--ds-color-base-subtle)] active:bg-[var(--ds-color-focus-muted)]"
);

export function TableActionMenuContent({
  showEdit,
  onCopy,
  onPaste,
  onEdit,
  onDelete,
  className = "",
}: TableActionMenuContentProps) {
  return (
    <div className={className}>
      <button type="button" className={itemClass} onClick={onCopy}>
        Копировать
      </button>
      <button type="button" className={itemClass} onClick={onPaste}>
        Вставить
      </button>
      {showEdit && onEdit && (
        <button type="button" className={itemClass} onClick={onEdit}>
          Редактировать
        </button>
      )}
      <hr className="my-1 h-px border-none bg-border" />
      <button
        type="button"
        className={cn(itemClass, "text-error hover:bg-error-muted")}
        onClick={onDelete}
      >
        Удалить
      </button>
    </div>
  );
}
