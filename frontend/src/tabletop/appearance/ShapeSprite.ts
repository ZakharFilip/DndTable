import type { TabletopBaseObject } from "@dnd-table/shared";
import { TRANSPARENT_FILL } from "./ShapeFill";

type ShapeMeta = { kind?: string };

export function isTabletopShape(obj: TabletopBaseObject): boolean {
  if (obj.type !== "shape") return false;
  const kind = (obj.metadata as ShapeMeta | undefined)?.kind;
  return kind === "shape" || kind === undefined;
}

export function hasSprite(obj: TabletopBaseObject): boolean {
  const sprite = obj.appearance?.sprite;
  return typeof sprite === "string" && sprite.length > 0;
}

export function attachSprite(obj: TabletopBaseObject, sprite: string): TabletopBaseObject {
  return {
    ...obj,
    appearance: {
      ...(obj.appearance ?? {}),
      sprite,
      fillColor: TRANSPARENT_FILL,
    },
  };
}

export function detachSprite(obj: TabletopBaseObject): TabletopBaseObject {
  const { sprite: _removed, ...appearanceRest } = obj.appearance ?? {};
  return {
    ...obj,
    appearance: {
      ...appearanceRest,
      fillColor: appearanceRest.fillColor ?? "#3b82f6",
    },
  };
}
