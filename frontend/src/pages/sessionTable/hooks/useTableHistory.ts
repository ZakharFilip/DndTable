import { useCallback, useRef } from "react";
import { HistoryManager, type HistoryOp } from "../../../tabletop/history/HistoryManager";

/**
 * Stable wrapper around HistoryManager. Returns push/undo/redo
 * primitives that take an `apply(ops)` argument (same as before).
 */
export function useTableHistory() {
  const historyRef = useRef(new HistoryManager());

  const push = useCallback((entry: { undo: HistoryOp[]; redo: HistoryOp[] }) => {
    historyRef.current.push(entry);
  }, []);

  const undo = useCallback((apply: (ops: HistoryOp[]) => void) => {
    historyRef.current.undo(apply);
  }, []);

  const redo = useCallback((apply: (ops: HistoryOp[]) => void) => {
    historyRef.current.redo(apply);
  }, []);

  return { push, undo, redo };
}
