import type { TabletopBaseObject } from "@dnd-table/shared";
import type { AccessSnapshot } from "@dnd-table/shared";
import type { Layer, TableObjectState } from "../../../tabletop/model";
import { ObjectPermissionsSection } from "./ObjectPermissionsSection";

interface InspectorPanelProps {
  selected: TableObjectState | null;
  selectedLayer: Layer | null;
  selectedKeys: string[];
  onUpdateLocal: (key: string, updater: (o: TableObjectState) => TableObjectState) => void;
  onCommit: (key: string) => void;
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

export function InspectorPanel({
  selected,
  selectedLayer,
  selectedKeys,
  onUpdateLocal,
  onCommit,
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

  return (
    <aside className="shrink-0 w-72 bg-white border-l border-gray-200 p-3 overflow-auto">
      <div className="text-xs font-medium text-gray-500 mb-2">Свойства</div>
      {!selected && selectedKeys.length === 0 && (
        <div className="text-sm text-gray-500">Выберите объект.</div>
      )}
      {selected && (
        <div className="space-y-3">
          {selectedKeys.length > 1 && (
            <div className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2 py-1">
              Выбрано объектов: {selectedKeys.length}
            </div>
          )}
          <div className="text-xs text-gray-500">
            key: <span className="font-mono">{selected.key}</span> · v{selected.version}
            {selectedKeys.length > 1 && (
              <span className="block text-gray-400 mt-0.5">
                Основной объект для координат и цвета
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selectedKeys.length < 2}
              className="px-3 py-1.5 rounded border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50"
              onClick={onGroup}
            >
              Group
            </button>
            <button
              type="button"
              disabled={!selected.obj.groupId}
              className="px-3 py-1.5 rounded border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50"
              onClick={onUngroup}
            >
              Ungroup
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-600">
              X
              <input
                className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
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
            <label className="text-xs text-gray-600">
              Y
              <input
                className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
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

          <label className="text-xs text-gray-600 block">
            Rotation (deg)
            <input
              className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
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

          {getMeta(selected.obj).kind !== "chip" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-gray-600">
                Width
                <input
                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
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
              <label className="text-xs text-gray-600">
                Height
                <input
                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
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

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-600">
              Fill
              <input
                className="mt-1 w-full h-9 border border-gray-300 rounded"
                type="color"
                value={
                  typeof selected.obj.appearance?.fillColor === "string"
                    ? selected.obj.appearance.fillColor
                    : "#3b82f6"
                }
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
            <label className="text-xs text-gray-600">
              Stroke
              <input
                className="mt-1 w-full h-9 border border-gray-300 rounded"
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
      )}
    </aside>
  );
}
