import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Permission, TabletopBaseObject } from "@dnd-table/shared";
import type { HistoryEntry, HistoryOp } from "../../../tabletop/history/HistoryManager";
import { historyEntry, layersOp, restoreOp } from "../../../tabletop/history/historyHelpers";
import type { TablePatchOp } from "../../../tabletop/realtime/TableSync";
import type { Layer, TableObjectState } from "../../../tabletop/model";
import { cloneObj, newOpId } from "../helpers";

interface UseObjectMutationsParams {
  enqueueOps: (ops: TablePatchOp[]) => void;
  pushHistory: (entry: HistoryEntry) => void;
  activeLayerId: string | null;
  objectsRef: MutableRefObject<TableObjectState[]>;
  layersRef: MutableRefObject<Layer[]>;
  setObjects: Dispatch<SetStateAction<TableObjectState[]>>;
  setLayers: Dispatch<SetStateAction<Layer[]>>;
  setSelectedKey: Dispatch<SetStateAction<string | null>>;
  setSelectedKeys: Dispatch<SetStateAction<string[]>>;
  localEditBeforeRef: MutableRefObject<
    Map<string, { obj: TabletopBaseObject; sortOrder: number }>
  >;
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

function layerPatchOp(layer: Layer, baseVersion: number): TablePatchOp {
  return {
    opId: newOpId(),
    action: "update",
    key: layer.key,
    baseVersion,
    patch: { props: { layer } as unknown as Record<string, unknown> },
  };
}

function syncLayersToServer(
  current: Layer[],
  target: Layer[],
  enqueueOps: (ops: TablePatchOp[]) => void
) {
  const currentById = new Map(current.map((l) => [l.id, l]));
  const targetById = new Map(target.map((l) => [l.id, l]));
  const ops: TablePatchOp[] = [];

  for (const layer of target) {
    const cur = currentById.get(layer.id);
    if (!cur) {
      ops.push({
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
      });
      continue;
    }
    const same =
      cur.name === layer.name &&
      cur.order === layer.order &&
      cur.visible === layer.visible &&
      cur.locked === layer.locked;
    if (!same) {
      const nextLayer = { ...layer, version: cur.version + 1 };
      ops.push(layerPatchOp(nextLayer, cur.version));
    }
  }

  for (const layer of current) {
    if (!targetById.has(layer.id)) {
      ops.push({
        opId: newOpId(),
        action: "delete",
        key: layer.key,
        baseVersion: layer.version,
      });
    }
  }

  if (ops.length > 0) enqueueOps(ops);
}

/**
 * Centralizes how table mutations are turned into:
 *   1) optimistic state updates,
 *   2) sync ops enqueued for the server,
 *   3) history entries (undo/redo).
 */
export function useObjectMutations(params: UseObjectMutationsParams) {
  const {
    enqueueOps,
    pushHistory,
    activeLayerId,
    objectsRef,
    layersRef,
    setObjects,
    setLayers,
    setSelectedKey,
    setSelectedKeys,
    localEditBeforeRef,
    canPerform,
  } = params;

  const recordRestoreHistory = useCallback(
    (
      key: string,
      before: { obj: TabletopBaseObject; sortOrder: number },
      after: { obj: TabletopBaseObject; sortOrder: number }
    ) => {
      pushHistory(
        historyEntry(
          [restoreOp(key, before.obj, before.sortOrder)],
          [restoreOp(key, after.obj, after.sortOrder)]
        )
      );
    },
    [pushHistory]
  );

  const createObject = useCallback(
    (key: string, obj: TabletopBaseObject, opts?: { skipHistory?: boolean }) => {
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

      if (!opts?.skipHistory) {
        pushHistory(
          historyEntry(
            [{ kind: "delete", key }],
            [{ kind: "create", key, obj: cloneObj(withLayer), sortOrder }]
          )
        );
      }
    },
    [activeLayerId, canPerform, enqueueOps, pushHistory, objectsRef, setObjects, setSelectedKey, setSelectedKeys]
  );

  const createObjectsBatch = useCallback(
    (items: Array<{ key: string; obj: TabletopBaseObject }>) => {
      if (items.length === 0) return;
      const created: Array<{ key: string; obj: TabletopBaseObject; sortOrder: number }> = [];
      syncSetObjects(objectsRef, setObjects, (prev) => {
        let next = [...prev];
        for (const { key, obj } of items) {
          if (!assertCan(canPerform, "CreateObject", key)) continue;
          const withLayer =
            activeLayerId && !obj.layerId ? { ...obj, layerId: activeLayerId } : obj;
          const sortOrder = next.length;
          next = [...next, { key, version: 1, sortOrder, obj: withLayer }];
          created.push({ key, obj: cloneObj(withLayer), sortOrder });
        }
        return next;
      });

      if (created.length === 0) return;

      enqueueOps(
        created.map(({ key, obj, sortOrder }) => ({
          opId: newOpId(),
          action: "create" as const,
          key,
          object: {
            type: obj.type,
            x: obj.transform.position.x,
            y: obj.transform.position.y,
            sortOrder,
            props: obj as unknown as Record<string, unknown>,
          },
        }))
      );

      pushHistory(
        historyEntry(
          created.map(({ key }) => ({ kind: "delete" as const, key })),
          created.map(({ key, obj, sortOrder }) => ({
            kind: "create" as const,
            key,
            obj,
            sortOrder,
          }))
        )
      );
    },
    [activeLayerId, canPerform, enqueueOps, pushHistory, objectsRef, setObjects]
  );

  const commitObject = useCallback(
    (key: string, opts?: { skipHistory?: boolean }) => {
      if (!assertCan(canPerform, "ChangeObjectProperties", key)) return;
      const current = objectsRef.current.find((o) => o.key === key);
      if (!current) return;
      const baseVersion = current.version;
      const before = localEditBeforeRef.current.get(key);

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
            props: (latest?.obj ?? current.obj) as unknown as Record<string, unknown>,
          },
        },
      ]);

      if (!opts?.skipHistory && before) {
        const after = objectsRef.current.find((o) => o.key === key);
        if (after) {
          recordRestoreHistory(key, before, {
            obj: cloneObj(after.obj),
            sortOrder: after.sortOrder,
          });
        }
        localEditBeforeRef.current.delete(key);
      }
    },
    [canPerform, enqueueOps, localEditBeforeRef, objectsRef, recordRestoreHistory, setObjects]
  );

  const commitObjectWith = useCallback(
    (key: string, nextObj: TabletopBaseObject, opts?: { skipHistory?: boolean }) => {
      if (!assertCan(canPerform, "ChangeObjectProperties", key)) return;
      const current = objectsRef.current.find((o) => o.key === key);
      if (!current) return;
      const baseVersion = current.version;
      const before = opts?.skipHistory
        ? null
        : localEditBeforeRef.current.get(key) ?? {
            obj: cloneObj(current.obj),
            sortOrder: current.sortOrder,
          };

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

      if (!opts?.skipHistory && before) {
        const after = objectsRef.current.find((o) => o.key === key);
        if (after) {
          recordRestoreHistory(key, before, {
            obj: cloneObj(after.obj),
            sortOrder: after.sortOrder,
          });
        }
        localEditBeforeRef.current.delete(key);
      }
    },
    [canPerform, enqueueOps, localEditBeforeRef, objectsRef, recordRestoreHistory, setObjects]
  );

  const commitObjectsBatch = useCallback(
    (keys: string[], opts?: { skipHistory?: boolean }) => {
      if (keys.some((k) => !assertCan(canPerform, "ModifyTransform", k))) return;
      const snapshots = keys
        .map((k) => objectsRef.current.find((o) => o.key === k))
        .filter(Boolean) as TableObjectState[];
      if (snapshots.length === 0) return;

      const keySet = new Set(keys);
      syncSetObjects(objectsRef, setObjects, (prev) =>
        prev.map((o) => (keySet.has(o.key) ? { ...o, version: o.version + 1 } : o))
      );

      enqueueOps(
        snapshots.map((o) => {
          const latest = objectsRef.current.find((x) => x.key === o.key) ?? o;
          return {
            opId: newOpId(),
            action: "update" as const,
            key: o.key,
            baseVersion: o.version,
            patch: {
              x: latest.obj.transform.position.x,
              y: latest.obj.transform.position.y,
              props: latest.obj as unknown as Record<string, unknown>,
            },
          };
        })
      );

      void opts;
    },
    [canPerform, enqueueOps, objectsRef, setObjects]
  );

  const deleteObject = useCallback(
    (key: string) => {
      if (!assertCan(canPerform, "DeleteObject", key)) return;
      const current = objectsRef.current.find((o) => o.key === key);
      if (!current) return;
      const baseVersion = current.version;

      syncSetObjects(objectsRef, setObjects, (prev) => prev.filter((o) => o.key !== key));
      setSelectedKey(null);
      setSelectedKeys([]);

      enqueueOps([{ opId: newOpId(), action: "delete", key, baseVersion }]);

      pushHistory(
        historyEntry(
          [{ kind: "create", key, obj: cloneObj(current.obj), sortOrder: current.sortOrder }],
          [{ kind: "delete", key }]
        )
      );
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
          syncSetObjects(objectsRef, setObjects, (prev) => prev.filter((o) => o.key !== op.key));
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
          syncSetObjects(objectsRef, setObjects, (prev) => [...prev, state]);
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
          syncSetObjects(objectsRef, setObjects, (prev) =>
            prev.map((o) =>
              o.key === op.key
                ? { ...o, version: o.version + 1, obj: op.obj, sortOrder: op.sortOrder }
                : o
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
          continue;
        }

        if (op.kind === "layers") {
          const current = layersRef.current;
          syncLayersToServer(current, op.layers, enqueueOps);
          setLayers((prev) => {
            const prevById = new Map(prev.map((l) => [l.id, l]));
            const next = op.layers
              .map((layer) => {
                const cur = prevById.get(layer.id);
                if (!cur) return layer;
                const changed =
                  cur.name !== layer.name ||
                  cur.order !== layer.order ||
                  cur.visible !== layer.visible ||
                  cur.locked !== layer.locked;
                return changed ? { ...layer, version: cur.version + 1 } : { ...layer, version: cur.version };
              })
              .sort((a, b) => a.order - b.order);
            layersRef.current = next;
            return next;
          });
        }
      }
    },
    [enqueueOps, layersRef, objectsRef, setLayers, setObjects]
  );

  const createLayer = useCallback(
    (layer: Layer, opts?: { activate?: boolean; skipHistory?: boolean }) => {
      const before = layersRef.current;
      setLayers((prev) => {
        if (prev.some((l) => l.id === layer.id)) return prev;
        const next = [...prev, layer].sort((a, b) => a.order - b.order);
        layersRef.current = next;
        return next;
      });
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
      if (!opts?.skipHistory) {
        const after = [...before, layer].sort((a, b) => a.order - b.order);
        pushHistory(historyEntry([layersOp(before)], [layersOp(after)]));
      }
      void opts;
    },
    [enqueueOps, layersRef, pushHistory, setLayers]
  );

  const deleteLayer = useCallback(
    (layer: Layer, opts?: { skipHistory?: boolean }) => {
      const before = layersRef.current;
      setLayers((prev) => {
        const next = prev.filter((l) => l.id !== layer.id);
        layersRef.current = next;
        return next;
      });
      enqueueOps([
        {
          opId: newOpId(),
          action: "delete",
          key: layer.key,
          baseVersion: layer.version,
        },
      ]);
      if (!opts?.skipHistory) {
        const after = before.filter((l) => l.id !== layer.id);
        pushHistory(historyEntry([layersOp(before)], [layersOp(after)]));
      }
    },
    [enqueueOps, layersRef, pushHistory, setLayers]
  );

  const updateLayer = useCallback(
    (layer: Layer, opts?: { skipHistory?: boolean }) => {
      const baseVersion = layer.version;
      setLayers((prev) => {
        const next = prev
          .map((l) => (l.id === layer.id ? { ...layer, version: layer.version + 1 } : l))
          .sort((a, b) => a.order - b.order);
        layersRef.current = next;
        return next;
      });
      enqueueOps([
        {
          opId: newOpId(),
          action: "update",
          key: layer.key,
          baseVersion,
          patch: { props: { layer: { ...layer, version: layer.version + 1 } } as unknown as Record<string, unknown> },
        },
      ]);
      void opts;
    },
    [enqueueOps, setLayers, layersRef]
  );

  const reorderLayers = useCallback(
    (orderedIds: string[]) => {
      const before = layersRef.current;
      const byId = new Map(before.map((l) => [l.id, l]));
      const max = orderedIds.length - 1;
      const changed = orderedIds.some((id, index) => {
        const layer = byId.get(id);
        return layer != null && layer.order !== max - index;
      });
      if (!changed) return;

      const next = before.map((layer) => {
        const index = orderedIds.indexOf(layer.id);
        if (index < 0) return layer;
        const nextOrder = max - index;
        return nextOrder === layer.order ? layer : { ...layer, order: nextOrder };
      });

      const sorted = [...next].sort((a, b) => a.order - b.order);
      setLayers((prev) => {
        const prevById = new Map(prev.map((l) => [l.id, l]));
        const updated = sorted.map((layer) => {
          const cur = prevById.get(layer.id);
          if (!cur || cur.order === layer.order) return { ...layer, version: cur?.version ?? layer.version };
          return { ...layer, version: cur.version + 1 };
        });
        layersRef.current = updated;
        return updated;
      });

      for (const layer of sorted) {
        const cur = byId.get(layer.id);
        if (cur && cur.order !== layer.order) {
          const bumped = { ...layer, version: cur.version + 1 };
          enqueueOps([layerPatchOp(bumped, cur.version)]);
        }
      }

      pushHistory(historyEntry([layersOp(before)], [layersOp(sorted)]));
    },
    [enqueueOps, layersRef, pushHistory, setLayers]
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
      syncSetObjects(objectsRef, setObjects, (prev) => prev.filter((o) => !removeSet.has(o.key)));
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

      pushHistory(
        historyEntry(
          removed.map((r) => ({
            kind: "create" as const,
            key: r.key,
            obj: r.obj,
            sortOrder: r.sortOrder,
          })),
          removed.map((r) => ({ kind: "delete" as const, key: r.key }))
        )
      );
    },
    [enqueueOps, pushHistory, objectsRef, setObjects, setSelectedKey, setSelectedKeys]
  );

  const pushRestoreBatch = useCallback(
    (
      entries: Array<{
        key: string;
        before: { obj: TabletopBaseObject; sortOrder: number };
        after: { obj: TabletopBaseObject; sortOrder: number };
      }>
    ) => {
      if (entries.length === 0) return;
      pushHistory(
        historyEntry(
          entries.map((e) => restoreOp(e.key, e.before.obj, e.before.sortOrder)),
          entries.map((e) => restoreOp(e.key, e.after.obj, e.after.sortOrder))
        )
      );
    },
    [pushHistory]
  );

  return {
    createObject,
    createObjectsBatch,
    commitObject,
    commitObjectWith,
    commitObjectsBatch,
    deleteObject,
    deleteObjects,
    applyHistoryOps,
    createLayer,
    updateLayer,
    deleteLayer,
    reorderLayers,
    pushRestoreBatch,
  };
}
