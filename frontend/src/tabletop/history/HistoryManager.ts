import type { TabletopBaseObject } from "@dnd-table/shared";

export type HistoryOp =
  | { kind: "delete"; key: string }
  | { kind: "create"; key: string; obj: TabletopBaseObject; sortOrder: number }
  | { kind: "restore"; key: string; obj: TabletopBaseObject; sortOrder: number };

export type HistoryEntry = { undo: HistoryOp[]; redo: HistoryOp[] };

export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  push(entry: HistoryEntry) {
    this.undoStack.push(entry);
    this.redoStack = [];
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  undo(apply: (ops: HistoryOp[]) => void) {
    const entry = this.undoStack.pop();
    if (!entry) return;
    apply(entry.undo);
    this.redoStack.push(entry);
  }

  redo(apply: (ops: HistoryOp[]) => void) {
    const entry = this.redoStack.pop();
    if (!entry) return;
    apply(entry.redo);
    this.undoStack.push(entry);
  }
}

