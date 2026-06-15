import type { TabletopBaseObject } from "@dnd-table/shared";
import type { AccessSnapshot } from "@dnd-table/shared";
import {
  TRANSPARENT_FILL,
  attachSprite,
  detachSprite,
  hasSprite,
  isTransparentFill,
} from "../../../tabletop/appearance";
import type { Layer, TableObjectState } from "../../../tabletop/model";
import { LayersSection } from "./LayersSection";
import { ObjectPermissionsSection } from "./ObjectPermissionsSection";

function sortedLayers(layers: Layer[]) {
  return [...layers].sort((a, b) => a.order - b.order);
}

interface InspectorPanelProps {
  open: boolean;
  onToggleOpen: () => void;
  selected: TableObjectState | null;
  selectedLayer: Layer | null;
  selectedKeys: string[];
  layers: Layer[];
  activeLayerId: string | null;
  onActivateLayer: (id: string) => void;
  onAddLayer: () => void;
  onToggleLayerVisible: (layer: Layer) => void;
  onToggleLayerLocked: (layer: Layer) => void;
  onReorderLayers: (orderedIds: string[]) => void;
  onUpdateLocal: (key: string, updater: (o: TableObjectState) => TableObjectState) => void;
  onCommit: (key: string) => void;
  onCommitWith: (key: string, obj: TabletopBaseObject) => void;
  getObjectByKey: (key: string) => TabletopBaseObject | null;
  onGroup: () => void;
  onUngroup: () => void;
  sessionId?: string;
  access?: AccessSnapshot | null;
  canManagePermissions?: boolean;
  onAccessChanged?: () => void;
}

type Meta = {
  kind?: string;
  width?: number;
  height?: number;
  radius?: number;
};

const getMeta = (o: TabletopBaseObject): Meta => (o.metadata as Meta | undefined) ?? {};

function fillColorForPicker(fillColor: string | undefined): string {
  if (!fillColor || isTransparentFill(fillColor) || !fillColor.startsWith("#")) {
    return "#3b82f6";
  }
  return fillColor.length === 7 ? fillColor : "#3b82f6";
}

export function InspectorPanel({
  open,
  onToggleOpen,
  selected,
  selectedLayer,
  selectedKeys,
  layers,
  activeLayerId,
  onActivateLayer,
  onAddLayer,
  onToggleLayerVisible,
  onToggleLayerLocked,
  onReorderLayers,
  onUpdateLocal,
  onCommit,
  onCommitWith,
  getObjectByKey,
  onGroup,
  onUngroup,
  sessionId,
  access,
  canManagePermissions = false,
  onAccessChanged,
}: InspectorPanelProps) {
  const locked = Boolean(selectedLayer?.locked);
  const permissionObjectKeys =
    selectedKeys.length > 0 ? selectedKeys : selected ? [selected.key] : [];
  const showLayers = !selected && selectedKeys.length === 0;

  if (!open) {
    return (
      <div className="st-inspector-collapsed">
        <button
          type="button"
          onClick={onToggleOpen}
          className="st-inspector-tab-btn"
          title="Открыть инспектор"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <aside className="st-inspector">
      <div className="st-panel-header">
        <button
          type="button"
          onClick={onToggleOpen}
          className="st-panel-collapse-btn"
          style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }}
          title="Свернуть инспектор"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <div className="w-full">
          <span className="st-panel-header-label">{showLayers ? "Панель" : "Объект"}</span>
          <div className="st-panel-header-title">{showLayers ? "Слои" : "Свойства"}</div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
      {showLayers && (
        <LayersSection
          layers={layers}
          activeLayerId={activeLayerId}
          onActivateLayer={onActivateLayer}
          onAddLayer={onAddLayer}
          onToggleLayerVisible={onToggleLayerVisible}
          onToggleLayerLocked={onToggleLayerLocked}
          onReorderLayers={onReorderLayers}
        />
      )}
      {selected && (() => {
        const sel = selected;
        const isShape = getMeta(sel.obj).kind === "shape";
        const spriteAttached = hasSprite(sel.obj);
        const fillTransparent = isTransparentFill(sel.obj.appearance?.fillColor);
        return (
        <div className="space-y-3">
          {selectedKeys.length > 1 && (
            <div className="text-xs text-primary-hover bg-primary-muted border border-primary/20 rounded px-2 py-1">
              Выбрано объектов: {selectedKeys.length}
            </div>
          )}
          <div className="text-xs text-text-secondary">
            key: <span className="font-mono">{selected.key}</span> · v{selected.version}
            {selectedKeys.length > 1 && (
              <span className="block text-text-muted mt-0.5">
                Основной объект для координат и цвета
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selectedKeys.length < 2}
              className="px-3 py-1.5 rounded border border-border text-sm hover:bg-background disabled:opacity-50"
              onClick={onGroup}
            >
              Group
            </button>
            <button
              type="button"
              disabled={!selected.obj.groupId}
              className="px-3 py-1.5 rounded border border-border text-sm hover:bg-background disabled:opacity-50"
              onClick={onUngroup}
            >
              Ungroup
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-text-secondary">
              X
              <input
                className="mt-1 w-full px-2 py-1 border border-border rounded text-sm"
                type="number"
                value={Number.isFinite(selected.obj.transform.position.x) ? selected.obj.transform.position.x : 0}
                disabled={locked}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  onUpdateLocal(selected.key, (o) => ({
                    ...o,
                    obj: {
                      ...o.obj,
                      transform: {
                        ...o.obj.transform,
                        position: { ...o.obj.transform.position, x: v },
                      },
                    },
                  }));
                }}
                onBlur={() => onCommit(selected.key)}
              />
            </label>
            <label className="text-xs text-text-secondary">
              Y
              <input
                className="mt-1 w-full px-2 py-1 border border-border rounded text-sm"
                type="number"
                value={Number.isFinite(selected.obj.transform.position.y) ? selected.obj.transform.position.y : 0}
                disabled={locked}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  onUpdateLocal(selected.key, (o) => ({
                    ...o,
                    obj: {
                      ...o.obj,
                      transform: {
                        ...o.obj.transform,
                        position: { ...o.obj.transform.position, y: v },
                      },
                    },
                  }));
                }}
                onBlur={() => onCommit(selected.key)}
              />
            </label>
          </div>

          <label className="text-xs text-text-secondary block">
            Rotation (deg)
            <input
              className="mt-1 w-full px-2 py-1 border border-border rounded text-sm"
              type="number"
              value={Number.isFinite(selected.obj.transform.rotation ?? 0) ? selected.obj.transform.rotation ?? 0 : 0}
              disabled={locked}
              onChange={(e) => {
                const v = Number(e.target.value);
                onUpdateLocal(selected.key, (o) => ({
                  ...o,
                  obj: { ...o.obj, transform: { ...o.obj.transform, rotation: v } },
                }));
              }}
              onBlur={() => onCommit(selected.key)}
            />
          </label>

          <label className="text-xs text-text-secondary block">
            Слой
            <select
              className="mt-1 w-full px-2 py-1 border border-border rounded text-sm bg-surface"
              value={selected.obj.layerId ?? ""}
              disabled={locked}
              onChange={(e) => {
                const layerId = e.target.value || null;
                const keys =
                  selectedKeys.length > 1 ? selectedKeys : [selected.key];
                for (const key of keys) {
                  onUpdateLocal(key, (o) => ({
                    ...o,
                    obj: { ...o.obj, layerId },
                  }));
                  onCommit(key);
                }
              }}
            >
              <option value="">Без слоя</option>
              {sortedLayers(layers).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>

          {getMeta(selected.obj).kind !== "chip" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-text-secondary">
                Width
                <input
                  className="mt-1 w-full px-2 py-1 border border-border rounded text-sm"
                  type="number"
                  min={1}
                  value={Number(getMeta(selected.obj).width ?? 120)}
                  disabled={locked}
                  onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value));
                    onUpdateLocal(selected.key, (o) => ({
                      ...o,
                      obj: { ...o.obj, metadata: { ...getMeta(o.obj), width: v } },
                    }));
                  }}
                  onBlur={() => onCommit(selected.key)}
                />
              </label>
              <label className="text-xs text-text-secondary">
                Height
                <input
                  className="mt-1 w-full px-2 py-1 border border-border rounded text-sm"
                  type="number"
                  min={1}
                  value={Number(getMeta(selected.obj).height ?? 80)}
                  disabled={locked}
                  onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value));
                    onUpdateLocal(selected.key, (o) => ({
                      ...o,
                      obj: { ...o.obj, metadata: { ...getMeta(o.obj), height: v } },
                    }));
                  }}
                  onBlur={() => onCommit(selected.key)}
                />
              </label>
            </div>
          )}

          {isShape && (
            <div className="space-y-2 border border-border rounded p-2 bg-background">
              <div className="text-xs font-medium text-text-secondary">Спрайт</div>
              {spriteAttached && (
                <p className="text-xs text-text-secondary">
                  Заливка прозрачна — выберите цвет, чтобы подсветить объект поверх спрайта.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <label
                  className={[
                    "px-2 py-1 text-xs border border-border rounded bg-surface hover:bg-background cursor-pointer",
                    locked ? "opacity-50 pointer-events-none" : "",
                  ].join(" ")}
                >
                  {spriteAttached ? "Заменить спрайт" : "Загрузить спрайт"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={locked}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      const keyAtPick = selected.key;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const sprite = typeof reader.result === "string" ? reader.result : "";
                        if (!sprite) return;
                        const latest = getObjectByKey(keyAtPick) ?? sel.obj;
                        onCommitWith(keyAtPick, attachSprite(latest, sprite));
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {spriteAttached && (
                  <button
                    type="button"
                    disabled={locked}
                    className="px-2 py-1 text-xs border border-border rounded bg-surface hover:bg-background disabled:opacity-50"
                    onClick={() => {
                      const latest = getObjectByKey(selected.key) ?? sel.obj;
                      onCommitWith(selected.key, detachSprite(latest));
                    }}
                  >
                    Убрать спрайт
                  </button>
                )}
                {spriteAttached && (
                  <button
                    type="button"
                    disabled={locked || fillTransparent}
                    className="px-2 py-1 text-xs border border-border rounded bg-surface hover:bg-background disabled:opacity-50"
                    onClick={() => {
                      onUpdateLocal(selected.key, (o) => ({
                        ...o,
                        obj: {
                          ...o.obj,
                          appearance: { ...(o.obj.appearance ?? {}), fillColor: TRANSPARENT_FILL },
                        },
                      }));
                      onCommit(selected.key);
                    }}
                  >
                    Сбросить заливку
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-text-secondary">
              Fill{fillTransparent ? " (прозрачный)" : ""}
              <input
                className="mt-1 w-full h-9 border border-border rounded"
                type="color"
                value={fillColorForPicker(selected.obj.appearance?.fillColor)}
                disabled={locked}
                onChange={(e) => {
                  const v = e.target.value;
                  onUpdateLocal(selected.key, (o) => ({
                    ...o,
                    obj: {
                      ...o.obj,
                      appearance: { ...(o.obj.appearance ?? {}), fillColor: v },
                    },
                  }));
                }}
                onBlur={() => onCommit(selected.key)}
              />
            </label>
            <label className="text-xs text-text-secondary">
              Stroke
              <input
                className="mt-1 w-full h-9 border border-border rounded"
                type="color"
                value={
                  typeof selected.obj.appearance?.strokeColor === "string" &&
                  selected.obj.appearance.strokeColor.startsWith("#")
                    ? selected.obj.appearance.strokeColor
                    : "#000000"
                }
                disabled={locked}
                onChange={(e) => {
                  const v = e.target.value;
                  onUpdateLocal(selected.key, (o) => ({
                    ...o,
                    obj: {
                      ...o.obj,
                      appearance: { ...(o.obj.appearance ?? {}), strokeColor: v },
                    },
                  }));
                }}
                onBlur={() => onCommit(selected.key)}
              />
            </label>
          </div>

          {sessionId && access && onAccessChanged && permissionObjectKeys.length > 0 && (
            <ObjectPermissionsSection
              sessionId={sessionId}
              objectKeys={permissionObjectKeys}
              access={access}
              canManage={canManagePermissions}
              onChanged={onAccessChanged}
            />
          )}
        </div>
        );
      })()}
      </div>
    </aside>
  );
}
