import type { Layer, Tool } from "../../../tabletop/model";

interface ToolsPanelProps {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
  layers: Layer[];
  activeLayerId: string | null;
  onActivateLayer: (id: string) => void;
  onAddLayer: () => void;
  onToggleLayerVisible: (layer: Layer) => void;
  onToggleLayerLocked: (layer: Layer) => void;
  onAddChip: () => void;
}

const TOOL_LABELS: Record<Tool, string> = {
  select: "Select",
  shape: "Shape",
  text: "Text",
  image: "Image",
  pan: "Pan",
};

const TOOLS: Tool[] = ["select", "shape", "text", "image", "pan"];

export function ToolsPanel({
  currentTool,
  onToolChange,
  layers,
  activeLayerId,
  onActivateLayer,
  onAddLayer,
  onToggleLayerVisible,
  onToggleLayerLocked,
  onAddChip,
}: ToolsPanelProps) {
  return (
    <aside className="shrink-0 w-44 bg-white border-r border-gray-200 p-3 space-y-2">
      <div className="text-xs font-medium text-gray-500">Инструменты</div>
      {TOOLS.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onToolChange(t)}
          className={[
            "w-full text-left px-3 py-2 rounded text-sm border",
            currentTool === t
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50",
          ].join(" ")}
        >
          {TOOL_LABELS[t]}
        </button>
      ))}

      <div className="pt-2 border-t border-gray-200 space-y-2">
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
          {layers
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((l) => (
              <div key={l.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onActivateLayer(l.id)}
                  className={[
                    "flex-1 px-2 py-1 rounded text-xs border text-left truncate",
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

      <div className="pt-2 border-t border-gray-200 space-y-2">
        <button
          type="button"
          onClick={onAddChip}
          className="w-full px-3 py-2 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-500"
        >
          + Фишка (MVP)
        </button>
      </div>
    </aside>
  );
}
