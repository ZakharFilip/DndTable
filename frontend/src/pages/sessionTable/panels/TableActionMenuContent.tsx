interface TableActionMenuContentProps {
  showEdit: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  className?: string;
}

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
      <button type="button" onClick={onCopy}>
        Копировать
      </button>
      <button type="button" onClick={onPaste}>
        Вставить
      </button>
      {showEdit && onEdit && (
        <button type="button" onClick={onEdit}>
          Редактировать
        </button>
      )}
      <hr />
      <button type="button" onClick={onDelete}>
        Удалить
      </button>
    </div>
  );
}
