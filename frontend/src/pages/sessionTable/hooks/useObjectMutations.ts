import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Permission, TabletopBaseObject } from "@dnd-table/shared";
import type { HistoryOp } from "../../../tabletop/history/HistoryManager";
import type { TablePatchOp } from "../../../tabletop/realtime/TableSync";
import type { Layer, TableObjectState } from "../../../tabletop/model";
import { cloneObj, newOpId } from "../helpers";

interface UseObjectMutationsParams {
  enqueueOps: (ops: TablePatchOp[]) => void;
  pushHistory: (entry: { undo: HistoryOp[]; redo: HistoryOp[] }) => void;
  activeLayerId: string | null;
  objectsRef: MutableRefObject<TableObjectState[]>;
  setObjects: Dispatch<SetStateAction<TableObjectState[]>>;
  setLayers: Dispatch<SetStateAction<Layer[]>>;
  setSelectedKey: Dispatch<SetStateAction<string | null>>;
  setSelectedKeys: Dispatch<SetStateAction<string[]>>;
  canPerform?: (permission: Permission, objectKey?: string) => boolean;
}

function assertCan(
  canPerform: UseObjectMutationsParams["canPerform"],
  permission: Permission,
  objectKey?: string
) {
  if (!canPerform) return true;
  return canPerform(permission, objectKey);
}

function syncSetObjects(
  objectsRef: MutableRefObject<TableObjectState[]>,
  setObjects: Dispatch<SetStateAction<TableObjectState[]>>,
  updater: (prev: TableObjectState[]) => TableObjectState[]
) {
  setObjects((prev) => {
    const next = updater(prev);
    objectsRef.current = next;
    return next;
  });
}

/**
 * Centralizes how table mutations are turned into:
 *   1) optimistic state updates,
 *   2) sync ops enqueued for the server,
 *   3) history entries (undo/redo).
 *
 * This eliminates ~5 near-identical copies of "build TablePatchOp" that
 * used to live inline inside SessionTablePage.
 */
export function useObjectMutations(params: UseObjectMutationsParams) {
  const {
    enqueueOps,
    pushHistory,
    activeLayerId,
    objectsRef,
    setObjects,
    setLayers,
    setSelectedKey,
    setSelectedKeys,
    canPerform,
  } = params;

  const createObject = useCallback(
    (key: string, obj: TabletopBaseObject) => {
      if (!assertCan(canPerform, "CreateObject", key)) return;
      const withLayer =
        activeLayerId && !obj.layerId ? { ...obj, layerId: activeLayerId } : obj;
      let sortOrder = 0;
      syncSetObjects(objectsRef, setObjects, (prev) => {
        sortOrder = prev.length;
        const state: TableObjectState = { key, version: 1, sortOrder, obj: withLayer };
        return [...prev, state];
      });
      setSelectedKey(key);
      setSelectedKeys([key]);

      enqueueOps([
        {
          opId: newOpId(),
          action: "create",
          key,
          object: {
            type: withLayer.type,
            x: withLayer.transform.position.x,
            y: withLayer.transform.position.y,
            sortOrder,
            props: withLayer as unknown as Record<string, unknown>,
          },
        },
      ]);

      pushHistory({
        undo: [{ kind: "delete", key }],
        redo: [{ kind: "create", key, obj: cloneObj(withLayer), sortOrder }],
      });
    },
    [activeLayerId, canPerform, enqueueOps, pushHistory, objectsRef, setObjects, setSelectedKey, setSelectedKeys]
  );

  const commitObject = useCallback(
    (key: string) => {
      if (!assertCan(canPerform, "ChangeObjectProperties", key)) return;
      const current = objectsRef.current.find((o) => o.key === key);
      if (!current) return;
      const baseVersion = current.version;
      const x = current.obj.transform.position.x;
      const y = current.obj.transform.position.y;

      syncSetObjects(objectsRef, setObjects, (prev) =>
        prev.map((o) => (o.key === key ? { ...o, version: o.version + 1 } : o))
      );

      const latest = objectsRef.current.find((o) => o.key === key);
      enqueueOps([
        {
          opId: newOpId(),
          action: "update",
          key,
          baseVersion,
          patch: {
            x,
            y,
            sortOrder: current.sortOrder,
            props: (latest?.obj ?? current.obj) as unknown as Record<string, unknown>,
          },
        },
      ]);
    },
    [canPerform, enqueueOps, objectsRef, setObjects]
  );

  const commitObjectWith = useCallback(
    (key: string, nextObj: TabletopBaseObject) => {
      if (!assertCan(canPerform, "ChangeObjectProperties", key)) return;
      const current = objectsRef.current.find((o) => o.key === key);
      if (!current) return;
      const baseVersion = current.version;

      syncSetObjects(objectsRef, setObjects, (prev) =>
        prev.map((o) => (o.key === key ? { ...o, version: o.version + 1, obj: nextObj } : o))
      );

      enqueueOps([
        {
          opId: newOpId(),
          action: "update",
          key,
          baseVersion,
          patch: {
            x: nextObj.transform.position.x,
            y: nextObj.transform.position.y,
            sortOrder: current.sortOrder,
            props: nextObj as unknown as Record<string, unknown>,
          },
        },
      ]);
    },
    [canPerform, enqueueOps, objectsRef, setObjects]
  );

  /** Batch commit after drag (single optimistic bump + one enqueue batch). */
  const commitObjectsBatch = useCallback(
    (keys: string[]) => {
      if (keys.some((k) => !assertCan(canPerform, "ModifyTransform", k))) return;
      const touched = keys
        .map((k) => objectsRef.current.find((o) => o.key === k))
        .filter(Boolean) as TableObjectState[];
      if (touched.length === 0) return;

      const keySet = new Set(keys);
      setObjects((prev) =>
        prev.map((o) => (keySet.has(o.key) ? { ...o, version: o.version + 1 } : o))
      );

      enqueueOps(
        touched.map((o) => ({
          opId: newOpId(),
          action: "update" as const,
          key: o.key,
          baseVersion: o.version,
          patch: {
            x: o.obj.transform.position.x,
            y: o.obj.transform.position.y,
            props: o.obj as unknown as Record<string, unknown>,
          },
        }))
      );
    },
    [canPerform, enqueueOps, objectsRef, setObjects]
  );

  const deleteObject = useCallback(
    (key: string) => {
      if (!assertCan(canPerform, "DeleteObject", key)) return;
      const current = objectsRef.current.find((o) => o.key === key);
      if (!current) return;
      const baseVersion = current.version;

      setObjects((prev) => prev.filter((o) => o.key !== key));
      setSelectedKey(null);
      setSelectedKeys([]);

      enqueueOps([{ opId: newOpId(), action: "delete", key, baseVersion }]);

      pushHistory({
        undo: [{ kind: "create", key, obj: cloneObj(current.obj), sortOrder: current.sortOrder }],
        redo: [{ kind: "delete", key }],
      });
    },
    [canPerform, enqueueOps, pushHistory, objectsRef, setObjects, setSelectedKey, setSelectedKeys]
  );

  const applyHistoryOps = useCallback(
    (ops: HistoryOp[]) => {
      for (const op of ops) {
        if (op.kind === "delete") {
          const current = objectsRef.current.find((o) => o.key === op.key);
          if (!current) continue;
          const baseVersion = current.version;
          setObjects((prev) => prev.filter((o) => o.key !== op.key));
          enqueueOps([{ opId: newOpId(), action: "delete", key: op.key, baseVersion }]);
          continue;
        }

        if (op.kind === "create") {
          const exists = objectsRef.current.some((o) => o.key === op.key);
          if (exists) continue;
          const state: TableObjectState = {
            key: op.key,
            version: 1,
            sortOrder: op.sortOrder,
            obj: op.obj,
          };
          setObjects((prev) => [...prev, state]);
          enqueueOps([
            {
              opId: newOpId(),
              action: "create",
              key: op.key,
              object: {
                type: op.obj.type,
                x: op.obj.transform.position.x,
                y: op.obj.transform.position.y,
                sortOrder: op.sortOrder,
                props: op.obj as unknown as Record<string, unknown>,
              },
            },
          ]);
          continue;
        }

        if (op.kind === "restore") {
          const current = objectsRef.current.find((o) => o.key === op.key);
          if (!current) continue;
          const baseVersion = current.version;
          setObjects((prev) =>
            prev.map((o) =>
              o.key === op.key ? { ...o, obj: op.obj, sortOrder: op.sortOrder } : o
            )
          );
          enqueueOps([
            {
              opId: newOpId(),
              action: "update",
              key: op.key,
              baseVersion,
              patch: {
                x: op.obj.transform.position.x,
                y: op.obj.transform.position.y,
                sortOrder: op.sortOrder,
                props: op.obj as unknown as Record<string, unknown>,
              },
            },
          ]);
        }
      }
    },
    [enqueueOps, objectsRef, setObjects]
  );

  // Layers — kept here because layer ops share the same op-id / enqueue flow.
  const createLayer = useCallback(
    (layer: Layer, opts?: { activate?: boolean }) => {
      setLayers((prev) => [...prev, layer].sort((a, b) => a.order - b.order));
      enqueueOps([
        {
          opId: newOpId(),
          action: "create",
          key: layer.key,
          object: {
            type: "layer",
            x: 0,
            y: 0,
            sortOrder: layer.order,
            props: { layer } as unknown as Record<string, unknown>,
          },
        },
      ]);
      void opts; // activation handled by caller (state belongs to page)
    },
    [enqueueOps, setLayers]
  );

  const updateLayer = useCallback(
    (layer: Layer) => {
      const baseVersion = layer.version;
      setLayers((prev) =>
        prev
          .map((l) => (l.id === layer.id ? { ...layer, version: layer.version + 1 } : l))
          .sort((a, b) => a.order - b.order)
      );
      enqueueOps([
        {
          opId: newOpId(),
          action: "update",
          key: layer.key,
          baseVersion,
          patch: { props: { layer } as unknown as Record<string, unknown> },
        },
      ]);
    },
    [enqueueOps, setLayers]
  );

  const deleteObjects = useCallback(
    (keys: string[]) => {
      const unique = [...new Set(keys)];
      if (unique.length === 0) return;

      const removed: Array<{
        key: string;
        obj: TabletopBaseObject;
        sortOrder: number;
        baseVersion: number;
      }> = [];
      for (const key of unique) {
        const current = objectsRef.current.find((o) => o.key === key);
        if (!current) continue;
        removed.push({
          key,
          obj: cloneObj(current.obj),
          sortOrder: current.sortOrder,
          baseVersion: current.version,
        });
      }
      if (removed.length === 0) return;

      const removeSet = new Set(removed.map((r) => r.key));
      setObjects((prev) => prev.filter((o) => !removeSet.has(o.key)));
      setSelectedKey(null);
      setSelectedKeys([]);

      enqueueOps(
        removed.map((r) => ({
          opId: newOpId(),
          action: "delete" as const,
          key: r.key,
          baseVersion: r.baseVersion,
        }))
      );

      pushHistory({
        undo: removed.map((r) => ({
          kind: "create" as const,
          key: r.key,
          obj: r.obj,
          sortOrder: r.sortOrder,
        })),
        redo: removed.map((r) => ({ kind: "delete" as const, key: r.key })),
      });
    },
    [enqueueOps, pushHistory, objectsRef, setObjects, setSelectedKey, setSelectedKeys]
  );

  return {
    createObject,
    commitObject,
    commitObjectWith,
    commitObjectsBatch,
    deleteObject,
    deleteObjects,
    applyHistoryOps,
    createLayer,
    updateLayer,
  };
}
