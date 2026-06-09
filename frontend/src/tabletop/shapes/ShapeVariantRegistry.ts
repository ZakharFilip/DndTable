import type { ShapeVariantId } from "./ShapeVariantId";
import type { IShapeVariant } from "./ShapeVariant";
import { rectangleVariant } from "./variants/rectangleVariant";
import { ellipseVariant } from "./variants/ellipseVariant";

const variants = new Map<ShapeVariantId, IShapeVariant>([
  [rectangleVariant.id, rectangleVariant],
  [ellipseVariant.id, ellipseVariant],
]);

export class ShapeVariantRegistry {
  static get(id: ShapeVariantId): IShapeVariant {
    const v = variants.get(id);
    if (!v) throw new Error(`Unknown shape variant: ${id}`);
    return v;
  }

  static list(): IShapeVariant[] {
    return Array.from(variants.values());
  }

  static ids(): ShapeVariantId[] {
    return Array.from(variants.keys());
  }
}
