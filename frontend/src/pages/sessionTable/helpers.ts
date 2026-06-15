import type { TabletopBaseObject } from "@dnd-table/shared";
import type { AccessSnapshot, ViewerContext } from "@dnd-table/shared";
import type { SessionFullDto } from "../../api/sessions";
import type { AppliedOp } from "../../tabletop/realtime/TableSync";
import {
  layerFromDto,
  objectFromDto,
  type Layer,
  type TableObjectState,
} from "../../tabletop/model";
import { resolveSpriteSrc } from "../../utils/spriteUrl";

const DEFAULT_BASE_LAYER_ID = "base";

export function defaultBaseLayer(): Layer {
  return {
    id: DEFAULT_BASE_LAYER_ID,
    key: `layer:${DEFAULT_BASE_LAYER_ID}`,
    version: 1,
    name: "Base",
    order: 0,
    visible: true,
    locked: false,
  };
}

/** Keep one row per layer id (highest version wins). */
export function dedupeLayersById(layers: Layer[]): Layer[] {
  const byId = new Map<string, Layer>();
  for (const layer of layers) {
    const existing = byId.get(layer.id);
    if (!existing || layer.version >= existing.version) {
      byId.set(layer.id, layer);
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.order - b.order);
}

/**
 * Layers are stored as `type: "layer"` rows. If none exist but objects
 * reference layerId, reconstruct layer list instead of creating duplicates.
 */
export function resolveLayersFromSession(
  layerRows: Layer[],
  objects: TableObjectState[]
): { layers: Layer[]; shouldSyncDefaultLayer: boolean } {
  if (layerRows.length > 0) {
    return { layers: dedupeLayersById(layerRows), shouldSyncDefaultLayer: false };
  }

  const ids = new Set<string>();
  for (const o of objects) {
    if (o.obj.layerId) ids.add(o.obj.layerId);
  }

  if (ids.size > 0) {
    const layers = Array.from(ids)
      .map((id, order) => ({
        id,
        key: `layer:${id}`,
        version: 1,
        name: id === DEFAULT_BASE_LAYER_ID ? "Base" : `Layer ${id}`,
        order,
        visible: true,
        locked: false,
      }))
      .sort((a, b) => a.order - b.order);
    return { layers, shouldSyncDefaultLayer: false };
  }

  return { layers: [defaultBaseLayer()], shouldSyncDefaultLayer: true };
}

/** Fit image into max box preserving aspect ratio. */
export function fitImageDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxW = 480,
  maxH = 480
): { width: number; height: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: 240, height: 160 };
  }
  const scale = Math.min(maxW / naturalWidth, maxH / naturalHeight, 1);
  return {
    width: Math.max(8, Math.round(naturalWidth * scale)),
    height: Math.max(8, Math.round(naturalHeight * scale)),
  };
}

export function loadImageNaturalSize(sprite: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        width: img.naturalWidth || 240,
        height: img.naturalHeight || 160,
      });
    img.onerror = () => resolve({ width: 240, height: 160 });
    img.src = sprite.startsWith("data:") ? sprite : resolveSpriteSrc(sprite);
  });
}

export const CLIP_PREFIX = "dnd-table/tabletop-object:";

let opCounter = 0;
export function newOpId() {
  opCounter += 1;
  return `op-${Date.now()}-${opCounter}-${Math.random().toString(16).slice(2)}`;
}

export interface ParsedSession {
  viewport: { panX: number; panY: number; scale: number } | null;
  layers: Layer[];
  objects: TableObjectState[];
  access?: AccessSnapshot;
  viewer?: ViewerContext;
}

export function parseSessionFull(data: SessionFullDto): ParsedSession {
  const viewport = data.state?.viewport ?? null;
  const layers = data.objects
    .map((o) => layerFromDto(o))
    .filter((x): x is Layer => Boolean(x))
    .sort((a, b) => a.order - b.order);
  const objects = data.objects
    .map((o) => objectFromDto(o))
    .filter((x): x is TableObjectState => Boolean(x));
  return {
    viewport,
    layers,
    objects,
    access: data.access,
    viewer: data.viewer,
  };
}

export function cloneObj(o: TabletopBaseObject): TabletopBaseObject {
  return JSON.parse(JSON.stringify(o)) as TabletopBaseObject;
}

function propsHaveSprite(props: Record<string, unknown> | undefined): boolean {
  if (!props || typeof props !== "object") return false;
  const appearance = (props as { appearance?: { sprite?: unknown } }).appearance;
  return typeof appearance?.sprite === "string" && appearance.sprite.length > 0;
}

export function appliedOpsIncludeSprites(applied: AppliedOp[]): boolean {
  return applied.some((op) => {
    if (op.action === "create") return propsHaveSprite(op.object.props);
    if (op.action === "update") return propsHaveSprite(op.patch.props);
    return false;
  });
}

/**
 * Pure reducers for incoming server broadcasts. They never touch React state
 * directly — the page just calls `setLayers(prev => applyBroadcastToLayers(prev, applied))`.
 */
export function applyBroadcastToLayers(prev: Layer[], applied: AppliedOp[]): Layer[] {
  let next = prev.slice();
  for (const op of applied) {
    if (op.action === "create" && op.object.type === "layer") {
      const l = layerFromDto({
        id: op.key,
        key: op.key,
        version: op.version,
        type: "layer",
        props: op.object.props,
      });
      if (!l) continue;
      const idx = next.findIndex((x) => x.id === l.id);
      if (idx < 0) next.push(l);
      else next[idx] = l;
    }
    if (op.action === "update") {
      const l = layerFromDto({
        id: op.key,
        key: op.key,
        version: op.version,
        type: "layer",
        props: op.patch.props,
      });
      if (!l) continue;
      next = next.map((x) => (x.id === l.id ? l : x));
    }
    if (op.action === "delete") {
      next = next.filter(
        (x) => `layer:${x.id}` !== op.key && `layer-${x.id}` !== op.key && x.id !== op.key
      );
    }
  }
  return next.sort((a, b) => a.order - b.order);
}

export function applyBroadcastToObjects(
  prev: TableObjectState[],
  applied: AppliedOp[]
): TableObjectState[] {
  let next = prev.slice();
  for (const op of applied) {
    if (op.action === "create") {
      const created = objectFromDto({
        id: op.key,
        key: op.key,
        version: op.version,
        type: op.object.type,
        x: op.object.x,
        y: op.object.y,
        sortOrder: op.object.sortOrder,
        props: op.object.props,
      });
      if (!created) continue;
      const exists = next.some((o) => o.key === op.key);
      if (!exists) next.push(created);
      else next = next.map((o) => (o.key === op.key ? { ...o, version: op.version } : o));
    } else if (op.action === "update") {
      next = next.map((o) => {
        if (o.key !== op.key) return o;
        const nextX = op.patch.x ?? o.obj.transform.position.x;
        const nextY = op.patch.y ?? o.obj.transform.position.y;
        const nextProps =
          op.patch.props ?? (o.obj as unknown as Record<string, unknown>);
        const patched = objectFromDto({
          id: op.key,
          key: op.key,
          version: op.version,
          type: o.obj.type,
          x: nextX,
          y: nextY,
          sortOrder: op.patch.sortOrder ?? o.sortOrder,
          props: nextProps,
        });
        return patched ?? { ...o, version: op.version };
      });
    } else if (op.action === "delete") {
      next = next.filter((o) => o.key !== op.key);
    }
  }
  return next;
}
