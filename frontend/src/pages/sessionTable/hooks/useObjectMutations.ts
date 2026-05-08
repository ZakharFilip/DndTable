import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { TabletopBaseObject } from "@dnd-table/shared";
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
  } = params;

  const createObject = useCallback(
    (key: string, obj: TabletopBaseObject) => {
      const withLayer =
        activeLayerId && !obj.layerId ? { ...obj, layerId: activeLayerId } : obj;
      const sortOrder = objectsRef.current.length;
      const state: TableObjectState = { key, version: 1, sortOrder, obj: withLayer };

      setObjects((prev) => [...prev, state]);
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
    [activeLayerId, enqueueOps, pushHistory, objectsRef, setObjects, setSelectedKey, setSelectedKeys]
  );

  const commitObject = useCallback(
    (key: string) => {
      const current = objectsRef.current.find((o) => o.key === key);
      if (!current) return;
      const baseVersion = current.version;
      const x = current.obj.transform.position.x;
      const y = current.obj.transform.position.y;

      setObjects((prev) =>
        prev.map((o) => (o.key === key ? { ...o, version: o.version + 1 } : o))
      );

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
            props: current.obj as unknown as Record<string, unknown>,
          },
        },
      ]);
    },
    [enqueueOps, objectsRef, setObjects]
  );

  const commitObjectWith = useCallback(
    (key: string, nextObj: TabletopBaseObject) => {
      const current = objectsRef.current.find((o) => o.key === key);
      if (!current) return;
      const baseVersion = current.version;

      setObjects((prev) =>
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
    [enqueueOps, objectsRef, setObjects]
  );

  const deleteObject = useCallback(
    (key: string) => {
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
    [enqueueOps, pushHistory, objectsRef, setObjects, setSelectedKey, setSelectedKeys]
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

  return {
    createObject,
    commitObject,
    commitObjectWith,
    deleteObject,
    applyHistoryOps,
    createLayer,
    updateLayer,
  };
}
