import type { TabletopBaseObject } from "@dnd-table/shared";
import type { ShapeVariantId } from "../shapes";
import { createTabletopShape } from "../shapes";
import { TRANSPARENT_FILL } from "./ShapeFill";
import { attachSprite, isTabletopShape } from "./ShapeSprite";
import type { TableObjectState } from "../model";

export type ShapeImageImportResult =
  | { action: "attach"; key: string; obj: TabletopBaseObject }
  | { action: "create"; key: string; obj: TabletopBaseObject };

/** Rectangle by default; ellipse only when shape tool + ellipse variant is active. */
export function resolvePasteShapeVariant(
  currentTool: string,
  activeShapeVariant: ShapeVariantId
): ShapeVariantId {
  return currentTool === "shape" ? activeShapeVariant : "rectangle";
}

export function resolveShapeImageImport(params: {
  sprite: string;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  pasteShapeVariant: ShapeVariantId;
  selectedKeys: string[];
  objects: TableObjectState[];
  nextKey: () => string;
}): ShapeImageImportResult {
  const { sprite, width, height, centerX, centerY, pasteShapeVariant, selectedKeys, objects, nextKey } =
    params;

  if (selectedKeys.length === 1) {
    const sel = objects.find((o) => o.key === selectedKeys[0]);
    if (sel && isTabletopShape(sel.obj)) {
      return {
        action: "attach",
        key: sel.key,
        obj: attachSprite(sel.obj, sprite),
      };
    }
  }

  const key = nextKey();
  const x = centerX - width / 2;
  const y = centerY - height / 2;
  const obj = createTabletopShape(
    pasteShapeVariant,
    { x, y, width, height },
    { key, sprite, fillColor: TRANSPARENT_FILL }
  );
  return { action: "create", key, obj };
}
