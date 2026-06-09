import type { TabletopBaseObject } from "@dnd-table/shared";
import type { ShapeVariantId } from "./ShapeVariantId";
import type { CreateShapeOptions, ShapeBounds } from "./ShapeVariant";
import { ShapeVariantRegistry } from "./ShapeVariantRegistry";

export function createTabletopShape(
  variantId: ShapeVariantId,
  bounds: ShapeBounds,
  options: CreateShapeOptions
): TabletopBaseObject {
  return ShapeVariantRegistry.get(variantId).create(bounds, options);
}
