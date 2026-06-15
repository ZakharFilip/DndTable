import { useCallback, useState } from "react";
import type { Layer } from "../../../tabletop/model";

interface LayersSectionProps {
  layers: Layer[];
  activeLayerId: string | null;
  onActivateLayer: (id: string) => void;
  onAddLayer: () => void;
  onToggleLayerVisible: (layer: Layer) => void;
  onToggleLayerLocked: (layer: Layer) => void;
  onReorderLayers: (orderedIds: string[]) => void;
  onDeleteLayer: (layer: Layer) => void;
  canDeleteLayers: boolean;
}

function sortedLayers(layers: Layer[]) {
  return [...layers].sort((a, b) => a.order - b.order);
}

export function LayersSection({
  layers,
  activeLayerId,
  onActivateLayer,
  onAddLayer,
  onToggleLayerVisible,
  onToggleLayerLocked,
  onReorderLayers,
  onDeleteLayer,
  canDeleteLayers,
}: LayersSectionProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const ordered = sortedLayers(layers);

  const handleDrop = useCallback(
    (targetId: string) => {
      if (!dragId || dragId === targetId) {
        setDragId(null);
        setDropTargetId(null);
        return;
      }
      const ids = ordered.map((l) => l.id);
      const fromIdx = ids.indexOf(dragId);
      const toIdx = ids.indexOf(targetId);
      if (fromIdx < 0 || toIdx < 0) return;
      const next = [...ids];
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, dragId);
      onReorderLayers(next);
      setDragId(null);
      setDropTargetId(null);
    },
    [dragId, ordered, onReorderLayers]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-text-secondary">Слои</div>
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={onAddLayer}
        >
          + Добавить
        </button>
      </div>
      <div className="space-y-1">
        {ordered.map((l) => (
          <div
            key={l.id}
            draggable
            onDragStart={() => setDragId(l.id)}
            onDragEnd={() => {
              setDragId(null);
              setDropTargetId(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDropTargetId(l.id);
            }}
            onDragLeave={() => setDropTargetId(null)}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(l.id);
            }}
            className={[
              "flex items-center gap-1 rounded transition-colors",
              dragId === l.id ? "opacity-40" : "",
              dropTargetId === l.id && dragId !== l.id ? "ring-2 ring-primary/30 bg-primary-muted/50" : "",
            ].join(" ")}
          >
            <span
              className="cursor-grab text-text-muted px-0.5 select-none"
              title="Перетащить"
            >
              ⋮⋮
            </span>
            <button
              type="button"
              onClick={() => onActivateLayer(l.id)}
              className={[
                "flex-1 px-2 py-1.5 rounded text-xs border text-left truncate",
                activeLayerId === l.id
                  ? "bg-primary text-white border-primary"
                  : "bg-surface text-text border-border hover:bg-background",
              ].join(" ")}
              title={l.name}
            >
              {l.name}
            </button>
            <button
              type="button"
              className="px-2 py-1 text-xs border rounded hover:bg-background"
              title={l.visible ? "Скрыть слой" : "Показать слой"}
              onClick={() => onToggleLayerVisible(l)}
            >
              {l.visible ? "Vis" : "Hid"}
            </button>
            <button
              type="button"
              className="px-2 py-1 text-xs border rounded hover:bg-background"
              title={l.locked ? "Разблокировать" : "Заблокировать"}
              onClick={() => onToggleLayerLocked(l)}
            >
              {l.locked ? "Lock" : "Free"}
            </button>
            <button
              type="button"
              className="px-2 py-1 text-xs border rounded hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed"
              title={
                !canDeleteLayers
                  ? "Нельзя удалить единственный слой"
                  : l.locked
                    ? "Слой заблокирован"
                    : "Удалить слой"
              }
              disabled={!canDeleteLayers || l.locked}
              onClick={() => onDeleteLayer(l)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
