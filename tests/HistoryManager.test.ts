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

  it("clear() empties undo and redo stacks", () => {
    const h = new HistoryManager();
    h.push(entry("a"));
    h.clear();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });

  it("stores layers snapshot ops", () => {
    const h = new HistoryManager();
    const layers = [
      { id: "a", key: "layer:a", version: 1, name: "A", order: 0, visible: true, locked: false },
    ];
    h.push({
      undo: [{ kind: "layers", layers }],
      redo: [{ kind: "layers", layers: [...layers, { id: "b", key: "layer:b", version: 1, name: "B", order: 1, visible: true, locked: false }] }],
    });
    const apply = vi.fn();
    h.undo(apply);
    expect(apply.mock.calls[0][0][0]).toMatchObject({ kind: "layers" });
  });
});
