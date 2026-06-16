import type { TabletopBaseObject } from "@dnd-table/shared";
import type { HistoryEntry, HistoryOp } from "./HistoryManager";
import type { Layer } from "../model";

export function cloneLayers(layers: Layer[]): Layer[] {
  return JSON.parse(JSON.stringify(layers)) as Layer[];
}

export function restoreOp(
  key: string,
  obj: TabletopBaseObject,
  sortOrder: number
): HistoryOp {
  return { kind: "restore", key, obj, sortOrder };
}

export function layersOp(layers: Layer[]): HistoryOp {
  return { kind: "layers", layers: cloneLayers(layers) };
}

export function historyEntry(
  undo: HistoryOp[],
  redo: HistoryOp[],
  label?: string
): HistoryEntry {
  return label ? { undo, redo, label } : { undo, redo };
}
