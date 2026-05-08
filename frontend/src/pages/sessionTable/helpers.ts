import type { TabletopBaseObject } from "@dnd-table/shared";
import type { SessionFullDto } from "../../api/sessions";
import type { AppliedOp } from "../../tabletop/realtime/TableSync";
import {
  layerFromDto,
  objectFromDto,
  type Layer,
  type TableObjectState,
} from "../../tabletop/model";

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
  return { viewport, layers, objects };
}

export function cloneObj(o: TabletopBaseObject): TabletopBaseObject {
  return JSON.parse(JSON.stringify(o)) as TabletopBaseObject;
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
      if (!next.some((x) => x.id === l.id)) next.push(l);
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
