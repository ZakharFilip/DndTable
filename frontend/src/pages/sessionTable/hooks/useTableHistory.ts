import { useCallback, useRef, useState } from "react";
import { HistoryManager, type HistoryEntry, type HistoryOp } from "../../../tabletop/history/HistoryManager";

/**
 * Stable wrapper around HistoryManager. Returns push/undo/redo
 * primitives that take an `apply(ops)` argument (same as before).
 */
export function useTableHistory() {
  const historyRef = useRef(new HistoryManager());
  const [, bump] = useState(0);
  const notify = useCallback(() => bump((n) => n + 1), []);

  const push = useCallback(
    (entry: HistoryEntry) => {
      historyRef.current.push(entry);
      notify();
    },
    [notify]
  );

  const clear = useCallback(() => {
    historyRef.current.clear();
    notify();
  }, [notify]);

  const canUndo = useCallback(() => historyRef.current.canUndo(), [bump]);
  const canRedo = useCallback(() => historyRef.current.canRedo(), [bump]);

  const undo = useCallback(
    (apply: (ops: HistoryOp[]) => void) => {
      historyRef.current.undo(apply);
      notify();
    },
    [notify]
  );

  const redo = useCallback(
    (apply: (ops: HistoryOp[]) => void) => {
      historyRef.current.redo(apply);
      notify();
    },
    [notify]
  );

  return { push, undo, redo, clear, canUndo, canRedo };
}
