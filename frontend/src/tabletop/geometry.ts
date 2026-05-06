import { CHIP_RADIUS, VIEW_MARGIN } from "./constants";
import type { TableObjectState } from "./model";

export type WorldPoint = { x: number; y: number };
export type WorldRect = { left: number; right: number; top: number; bottom: number };

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
  const meta: any = o.obj.metadata ?? {};

  if (meta.kind === "chip") {
    const r = typeof meta.radius === "number" ? meta.radius : CHIP_RADIUS;
    return { left: x - r, right: x + r, top: y - r, bottom: y + r };
  }

  const w = typeof meta.width === "number" ? meta.width : 120;
  const h = typeof meta.height === "number" ? meta.height : 80;
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

export function hitObject(worldX: number, worldY: number, objects: TableObjectState[]): TableObjectState | null {
  const sorted = objects.slice().sort((a, b) => {
    const az = a.obj.transform.position.z ?? 0;
    const bz = b.obj.transform.position.z ?? 0;
    if (az !== bz) return az - bz;
    return a.sortOrder - b.sortOrder;
  });

  for (let i = sorted.length - 1; i >= 0; i--) {
    const o = sorted[i];
    const meta: any = o.obj.metadata ?? {};
    const x = o.obj.transform.position.x;
    const y = o.obj.transform.position.y;

    if (meta.kind === "chip") {
      const r = typeof meta.radius === "number" ? meta.radius : CHIP_RADIUS;
      const dx = worldX - x;
      const dy = worldY - y;
      if (dx * dx + dy * dy <= r * r) return o;
      continue;
    }

    const aabb = getObjectAabb(o);
    if (worldX < aabb.left || worldX > aabb.right || worldY < aabb.top || worldY > aabb.bottom) continue;

    const w = typeof meta.width === "number" ? meta.width : 120;
    const h = typeof meta.height === "number" ? meta.height : 80;
    const shape = o.obj.appearance?.shape ?? "rectangle";

    // NOTE: rotation-precise hit-test can be added later; for now AABB covers rotated shapes.
    if (shape === "ellipse") {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = w / 2;
      const ry = h / 2;
      const nx = rx > 0 ? (worldX - cx) / rx : 0;
      const ny = ry > 0 ? (worldY - cy) / ry : 0;
      if (nx * nx + ny * ny <= 1) return o;
    } else {
      if (worldX >= x && worldX <= x + w && worldY >= y && worldY <= y + h) return o;
    }
  }

  return null;
}

