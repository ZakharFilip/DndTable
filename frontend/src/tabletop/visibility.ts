import type { Layer, TableObjectState } from "./model";

/**
 * Filters objects for the current viewer (team visibility) and editor layer visibility.
 */
export function filterObjectsForViewer(params: {
  objects: TableObjectState[];
  layers: Layer[];
  isObjectVisible: (objectKey: string) => boolean;
}): TableObjectState[] {
  const { objects, layers, isObjectVisible } = params;
  return objects.filter((o) => {
    const lid = o.obj.layerId ?? null;
    if (lid) {
      const layer = layers.find((l) => l.id === lid);
      if (layer && !layer.visible) return false;
    }
    return isObjectVisible(o.key);
  });
}
