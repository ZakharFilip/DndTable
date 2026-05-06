import type { TabletopBaseObject } from "@dnd-table/shared";
import { worldToScreen } from "../geometry";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export function getHandlesWorld(obj: TabletopBaseObject, scale: number) {
  const meta: any = obj.metadata ?? {};
  const x = obj.transform.position.x;
  const y = obj.transform.position.y;
  const w = typeof meta.width === "number" ? meta.width : 120;
  const h = typeof meta.height === "number" ? meta.height : 80;
  const deg = obj.transform.rotation ?? 0;
  const rad = (deg * Math.PI) / 180;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rot = (px: number, py: number) => ({
    x: cx + px * Math.cos(rad) - py * Math.sin(rad),
    y: cy + px * Math.sin(rad) + py * Math.cos(rad),
  });

  const handleWorld = {
    nw: rot(-w / 2, -h / 2),
    n: rot(0, -h / 2),
    ne: rot(w / 2, -h / 2),
    e: rot(w / 2, 0),
    se: rot(w / 2, h / 2),
    s: rot(0, h / 2),
    sw: rot(-w / 2, h / 2),
    w: rot(-w / 2, 0),
  } as const;
  const rotWorld = rot(0, -h / 2 - 28 / scale);
  return { handleWorld, rotWorld, cx, cy, w, h, deg };
}

export function pickHandle(params: {
  obj: TabletopBaseObject;
  pointerScreen: { x: number; y: number };
  stagePos: { x: number; y: number };
  scale: number;
  handlePx?: number;
}): { kind: "rotate" } | { kind: "resize"; handle: ResizeHandle } | null {
  const handlePx = params.handlePx ?? 10;
  const meta: any = params.obj.metadata ?? {};
  if (meta.kind === "chip") return null;

  const { handleWorld, rotWorld } = getHandlesWorld(params.obj, params.scale);
  const rotScreen = worldToScreen(rotWorld.x, rotWorld.y, params.stagePos, params.scale);
  const dx = params.pointerScreen.x - rotScreen.x;
  const dy = params.pointerScreen.y - rotScreen.y;
  if (dx * dx + dy * dy <= handlePx * handlePx) return { kind: "rotate" };

  for (const [h, p] of Object.entries(handleWorld) as Array<[ResizeHandle, { x: number; y: number }]>) {
    const s = worldToScreen(p.x, p.y, params.stagePos, params.scale);
    if (Math.abs(params.pointerScreen.x - s.x) <= handlePx && Math.abs(params.pointerScreen.y - s.y) <= handlePx) {
      return { kind: "resize", handle: h };
    }
  }
  return null;
}

