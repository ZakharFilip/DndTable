import type { Layer, TableObjectState } from "./model";

/** Objects without layerId render below all defined layers. */
export const NO_LAYER_ORDER = -1;

export function layerOrderOf(
  layerId: string | null | undefined,
  layers: Layer[]
): number {
  if (!layerId) return NO_LAYER_ORDER;
  const layer = layers.find((l) => l.id === layerId);
  return layer?.order ?? NO_LAYER_ORDER;
}

/**
 * Compare paint / hit-test order (ascending = back to front).
 * Priority: drag boost → layer.order → position.z → sortOrder within layer.
 */
export function compareObjectStack(
  a: TableObjectState,
  b: TableObjectState,
  layers: Layer[],
  frontSet?: ReadonlySet<string>
): number {
  const af = frontSet?.has(a.key) ? 1 : 0;
  const bf = frontSet?.has(b.key) ? 1 : 0;
  if (af !== bf) return af - bf;

  const aLayer = layerOrderOf(a.obj.layerId, layers);
  const bLayer = layerOrderOf(b.obj.layerId, layers);
  if (aLayer !== bLayer) return aLayer - bLayer;

  const az = a.obj.transform.position.z ?? 0;
  const bz = b.obj.transform.position.z ?? 0;
  if (az !== bz) return az - bz;

  return a.sortOrder - b.sortOrder;
}

/** Photoshop: top of panel = highest order (front). */
export function sortLayersForPanel(layers: Layer[]): Layer[] {
  return [...layers].sort((a, b) => b.order - a.order);
}

/** Assign order from top-to-bottom panel list (first id = front = max order). */
export function ordersFromPanelIds(orderedIds: string[]): Map<string, number> {
  const map = new Map<string, number>();
  const max = orderedIds.length - 1;
  orderedIds.forEach((id, index) => {
    map.set(id, max - index);
  });
  return map;
}
