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
        <div className="text-xs font-medium text-gray-500">Слои</div>
        <button
          type="button"
          className="text-xs text-indigo-600 hover:underline"
          onClick={onAddLayer}
        >
          + Add
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
              dropTargetId === l.id && dragId !== l.id ? "ring-2 ring-indigo-300 bg-indigo-50/50" : "",
            ].join(" ")}
          >
            <span
              className="cursor-grab text-gray-400 px-0.5 select-none"
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
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50",
              ].join(" ")}
              title={l.name}
            >
              {l.name}
            </button>
            <button
              type="button"
              className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
              title={l.visible ? "Скрыть слой" : "Показать слой"}
              onClick={() => onToggleLayerVisible(l)}
            >
              {l.visible ? "Vis" : "Hid"}
            </button>
            <button
              type="button"
              className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
              title={l.locked ? "Разблокировать" : "Заблокировать"}
              onClick={() => onToggleLayerLocked(l)}
            >
              {l.locked ? "Lock" : "Free"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
