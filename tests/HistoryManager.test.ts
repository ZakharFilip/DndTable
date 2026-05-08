import { describe, expect, it, vi } from "vitest";
import {
  HistoryManager,
  type HistoryOp,
} from "../frontend/src/tabletop/history/HistoryManager";

const entry = (key: string) => ({
  undo: [{ kind: "delete", key } as HistoryOp],
  redo: [{ kind: "delete", key } as HistoryOp],
});

describe("HistoryManager", () => {
  it("undo() returns the most recently pushed entry", () => {
    const h = new HistoryManager();
    h.push(entry("a"));
    h.push(entry("b"));

    const apply = vi.fn();
    h.undo(apply);

    expect(apply).toHaveBeenCalledTimes(1);
    const ops = apply.mock.calls[0][0] as HistoryOp[];
    expect(ops[0]).toMatchObject({ kind: "delete", key: "b" });
  });

  it("redo() replays the entry that was just undone", () => {
    const h = new HistoryManager();
    h.push(entry("x"));

    const undoApply = vi.fn();
    const redoApply = vi.fn();
    h.undo(undoApply);
    h.redo(redoApply);

    expect(undoApply).toHaveBeenCalledTimes(1);
    expect(redoApply).toHaveBeenCalledTimes(1);
  });

  it("a new push() clears the redo stack", () => {
    const h = new HistoryManager();
    h.push(entry("a"));
    h.undo(() => {});
    expect(h.canRedo()).toBe(true);

    h.push(entry("b"));
    expect(h.canRedo()).toBe(false);
  });

  it("undo()/redo() on empty stacks are no-ops", () => {
    const h = new HistoryManager();
    const apply = vi.fn();
    h.undo(apply);
    h.redo(apply);
    expect(apply).not.toHaveBeenCalled();
  });
});
