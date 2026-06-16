import type { TabletopBaseObject } from "@dnd-table/shared";
import { CHIP_RADIUS, VIEW_MARGIN } from "./constants";
import type { Layer, TableObjectState } from "./model";
import { compareObjectStack } from "./layerOrder";

export type WorldPoint = { x: number; y: number };
export type WorldRect = { left: number; right: number; top: number; bottom: number };

/**
 * Normalizes the various ways an object stores its size:
 *   - chip: `metadata.kind === "chip"`, optional `radius`
 *   - everything else: `metadata.width` / `metadata.height` with defaults
 *
 * Centralizing this kills the `(o.obj.metadata as any).kind/.width/.height`
 * casts that used to be sprinkled across renderer / hit-test / handles / page.
 */
export interface ObjectSize {
  width: number;
  height: number;
  isChip: boolean;
  radius: number;
  kind?: string;
}

export function getObjectSize(obj: TabletopBaseObject): ObjectSize {
  const meta = (obj.metadata as { kind?: string; width?: number; height?: number; radius?: number } | undefined) ?? {};
  const isChip = meta.kind === "chip";
  return {
    width: typeof meta.width === "number" ? meta.width : 120,
    height: typeof meta.height === "number" ? meta.height : 80,
    isChip,
    radius: typeof meta.radius === "number" ? meta.radius : CHIP_RADIUS,
    kind: meta.kind,
  };
}

export function screenToWorld(
  sx: number,
  sy: number,
  stagePos: { x: number; y: number },
  scale: number
): WorldPoint {
  return {
    x: (sx - stagePos.x) / scale,
    y: (sy - stagePos.y) / scale,
  };
}

export function worldToScreen(
  wx: number,
  wy: number,
  stagePos: { x: number; y: number },
  scale: number
) {
  return {
    x: wx * scale + stagePos.x,
    y: wy * scale + stagePos.y,
  };
}

/** Visible rect in world coords with VIEW_MARGIN. */
export function getVisibleWorldRect(stagePos: { x: number; y: number }, scale: number, width: number, height: number): WorldRect {
  const margin = VIEW_MARGIN / scale;
  return {
    left: (0 - stagePos.x) / scale - margin,
    right: (width - stagePos.x) / scale + margin,
    top: (0 - stagePos.y) / scale - margin,
    bottom: (height - stagePos.y) / scale + margin,
  };
}

export function getObjectAabb(o: TableObjectState): WorldRect {
  const x = o.obj.transform.position.x;
  const y = o.obj.transform.position.y;
  const size = getObjectSize(o.obj);

  if (size.isChip) {
    const r = size.radius;
    return { left: x - r, right: x + r, top: y - r, bottom: y + r };
  }

  const w = size.width;
  const h = size.height;
  const deg = o.obj.transform.rotation ?? 0;
  const rad = (deg * Math.PI) / 180;
  if (!deg) return { left: x, top: y, right: x + w, bottom: y + h };

  const cx = x + w / 2;
  const cy = y + h / 2;
  const corners = [
    { x: -w / 2, y: -h / 2 },
    { x: w / 2, y: -h / 2 },
    { x: w / 2, y: h / 2 },
    { x: -w / 2, y: h / 2 },
  ].map((p) => ({
    x: cx + p.x * Math.cos(rad) - p.y * Math.sin(rad),
    y: cy + p.x * Math.sin(rad) + p.y * Math.cos(rad),
  }));
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

export function objectInRect(o: TableObjectState, r: WorldRect) {
  const aabb = getObjectAabb(o);
  return !(aabb.right < r.left || aabb.left > r.right || aabb.bottom < r.top || aabb.top > r.bottom);
}

/** Hit-test in object local space (accounts for rotation). */
export function pointInObject(obj: TabletopBaseObject, worldX: number, worldY: number): boolean {
  const size = getObjectSize(obj);
  const x = obj.transform.position.x;
  const y = obj.transform.position.y;

  if (size.isChip) {
    const dx = worldX - x;
    const dy = worldY - y;
    return dx * dx + dy * dy <= size.radius * size.radius;
  }

  const w = size.width;
  const h = size.height;
  const deg = obj.transform.rotation ?? 0;
  const rad = (deg * Math.PI) / 180;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const lx = worldX - cx;
  const ly = worldY - cy;
  const px = lx * Math.cos(-rad) - ly * Math.sin(-rad);
  const py = lx * Math.sin(-rad) + ly * Math.cos(-rad);

  const shape = obj.appearance?.shape ?? "rectangle";
  if (shape === "ellipse") {
    const rx = w / 2;
    const ry = h / 2;
    const nx = rx > 0 ? px / rx : 0;
    const ny = ry > 0 ? py / ry : 0;
    return nx * nx + ny * ny <= 1;
  }
  return px >= -w / 2 && px <= w / 2 && py >= -h / 2 && py <= h / 2;
}

export function hitObject(
  worldX: number,
  worldY: number,
  objects: TableObjectState[],
  layers: Layer[] = []
): TableObjectState | null {
  const sorted = objects
    .slice()
    .sort((a, b) => compareObjectStack(a, b, layers));

  for (let i = sorted.length - 1; i >= 0; i--) {
    const o = sorted[i];
    const aabb = getObjectAabb(o);
    if (worldX < aabb.left || worldX > aabb.right || worldY < aabb.top || worldY > aabb.bottom) {
      continue;
    }
    if (pointInObject(o.obj, worldX, worldY)) return o;
  }

  return null;
}

