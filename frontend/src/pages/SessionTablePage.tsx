import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { TabletopBaseObject } from "@dnd-table/shared";

import { CanvasRenderer } from "../tabletop/render/CanvasRenderer";
import { SpatialIndex } from "../tabletop/spatial";
import {
  getVisibleWorldRect,
  hitObject,
  objectInRect,
  screenToWorld,
} from "../tabletop/geometry";
import { TableController } from "../tabletop/controller/TableController";
import { pickHandle } from "../tabletop/controller/handles";
import {
  nextObjectKey,
  toTabletopText,
  type Layer,
  type TableObjectState,
  type Tool,
} from "../tabletop/model";
import { createTabletopShape, type ShapeVariantId } from "../tabletop/shapes";
import {
  applyBroadcastToLayers,
  applyBroadcastToObjects,
  cloneObj,
  resolveLayersFromSession,
  type ParsedSession,
} from "./sessionTable/helpers";
import type { AppliedOp } from "../tabletop/realtime/TableSync";
import { useTableData, useInitialLoad } from "./sessionTable/hooks/useTableData";
import { useTableSync } from "./sessionTable/hooks/useTableSync";
import { useTableHistory } from "./sessionTable/hooks/useTableHistory";
import { useObjectMutations } from "./sessionTable/hooks/useObjectMutations";
import { useCopyPaste } from "./sessionTable/hooks/useCopyPaste";
import { useKeyboardShortcuts } from "./sessionTable/hooks/useKeyboardShortcuts";
import { SessionChrome } from "./sessionTable/panels/SessionChrome";
import { ToolsToolbar } from "./sessionTable/panels/ToolsToolbar";
import { InspectorPanel } from "./sessionTable/panels/InspectorPanel";
import { TextEditOverlay } from "./sessionTable/panels/TextEditOverlay";
import { TableContextMenu } from "./sessionTable/panels/TableContextMenu";
import { TeamSettingsPanel } from "./sessionTable/panels/TeamSettingsPanel";
import { useSessionAccess } from "./sessionTable/hooks/useSessionAccess";
import { filterObjectsForViewer } from "../tabletop/visibility";
import { getSocket } from "../realtime/socket";
import "./sessionTable/SessionTableLayout.css";

const layerKey = (id: string) => `layer:${id}`;

export default function SessionTablePage() {
  const { id } = useParams<{ id: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [objects, setObjects] = useState<TableObjectState[]>([]);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  const objectsRef = useRef<TableObjectState[]>([]);
  const layersRef = useRef<Layer[]>([]);
  const stagePosRef = useRef(stagePos);
  const scaleRef = useRef(scale);
  const stageSizeRef = useRef(stageSize);
  useEffect(() => { objectsRef.current = objects; }, [objects]);
  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { stagePosRef.current = stagePos; }, [stagePos]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { stageSizeRef.current = stageSize; }, [stageSize]);

  const [currentTool, setCurrentTool] = useState<Tool>("select");
  const [activeShapeVariant, setActiveShapeVariant] = useState<ShapeVariantId>("rectangle");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const contextKeyRef = useRef<string | null>(null);
  const selectionDraftRef = useRef<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);

  const primarySelectionKey = selectedKey ?? selectedKeys[0] ?? null;

  const [imageTick, setImageTick] = useState(0);
  const [draftRect, setDraftRect] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [draggingKeys, setDraggingKeys] = useState<string[]>([]);
  const shouldSyncDefaultLayerRef = useRef(false);

  const dragObjectKey = useRef<string | null>(null);
  const dragStartObjPos = useRef<{ x: number; y: number } | null>(null);
  const shapeDraft = useRef<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);
  const lastWorldRef = useRef<{ x: number; y: number } | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const controllerRef = useRef<TableController | null>(null);
  useEffect(() => {
    if (!rendererRef.current) {
      rendererRef.current = new CanvasRenderer(imageCacheRef.current, () =>
        setImageTick((t) => t + 1)
      );
    }
    if (!controllerRef.current) {
      controllerRef.current = new TableController();
    }
  }, []);

  // Stable per-tab clientId for optimistic updates / ignoring our own broadcasts.
  const clientId = useMemo(() => {
    const key = "dnd.clientId";
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const created = `c-${Math.random().toString(16).slice(2)}-${Date.now()}`;
    sessionStorage.setItem(key, created);
    return created;
  }, []);

  // ---- Loading & sync ----------------------------------------------------

  const sessionAccess = useSessionAccess(id);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const isObjectVisibleRef = useRef(sessionAccess.isObjectVisible);
  useEffect(() => {
    isObjectVisibleRef.current = sessionAccess.isObjectVisible;
  }, [sessionAccess.isObjectVisible]);

  const applyData = useCallback(
    (parsed: ParsedSession) => {
      if (parsed.viewport) {
        setStagePos({ x: parsed.viewport.panX, y: parsed.viewport.panY });
        setScale(parsed.viewport.scale);
      }
      const { layers: resolvedLayers, shouldSyncDefaultLayer } = resolveLayersFromSession(
        parsed.layers,
        parsed.objects
      );
      shouldSyncDefaultLayerRef.current = shouldSyncDefaultLayer;
      setLayers(resolvedLayers);
      setActiveLayerId((prev) => prev ?? resolvedLayers[0]?.id ?? null);
      setObjects(parsed.objects);
      sessionAccess.setFromFull(parsed.access, parsed.viewer);
    },
    [sessionAccess.setFromFull]
  );

  const { loadStatus, fetchFull } = useTableData(id);
  useInitialLoad(id, fetchFull, applyData);

  const onConflict = useCallback(async () => {
    const parsed = await fetchFull();
    if (parsed) applyData(parsed);
  }, [fetchFull, applyData]);

  const onBroadcast = useCallback((applied: AppliedOp[]) => {
    setLayers((prev) => applyBroadcastToLayers(prev, applied));
    setObjects((prev) => {
      const next = applyBroadcastToObjects(prev, applied);
      objectsRef.current = next;
      return next;
    });
  }, []);

  const { syncStatus, enqueueOps, flushNow } = useTableSync({
    id,
    clientId,
    onConflict,
    onBroadcast,
  });

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    const onAccessChanged = (payload: { tableId?: string }) => {
      if (payload?.tableId === id) void sessionAccess.refetch();
    };
    socket.on("access:changed", onAccessChanged);
    return () => {
      socket.off("access:changed", onAccessChanged);
    };
  }, [id, sessionAccess.refetch]);

  // ---- History & mutations ----------------------------------------------

  const { push: pushHistory, undo: undoHistory, redo: redoHistory } = useTableHistory();

  const {
    createObject,
    commitObject,
    commitObjectWith,
    commitObjectsBatch,
    deleteObjects,
    applyHistoryOps,
    createLayer,
    updateLayer,
  } = useObjectMutations({
    enqueueOps,
    pushHistory,
    activeLayerId,
    objectsRef,
    setObjects,
    setLayers,
    setSelectedKey,
    setSelectedKeys,
    canPerform: sessionAccess.can,
  });

  const undo = useCallback(() => undoHistory(applyHistoryOps), [undoHistory, applyHistoryOps]);
  const redo = useCallback(() => redoHistory(applyHistoryOps), [redoHistory, applyHistoryOps]);

  const deleteSelected = useCallback(() => {
    const keys =
      selectedKeys.length > 0
        ? selectedKeys
        : selectedKey
          ? [selectedKey]
          : [];
    if (keys.length === 0) return;
    contextKeyRef.current = null;
    deleteObjects(keys);
  }, [selectedKey, selectedKeys, deleteObjects]);

  // ---- Copy/paste --------------------------------------------------------

  const { copySelection, pasteSelection, importImageSprite } = useCopyPaste({
    id,
    editingKey,
    currentTool,
    primaryKey: primarySelectionKey,
    selectedKeys,
    activeShapeVariant,
    objectsRef,
    stagePosRef,
    scaleRef,
    stageSizeRef,
    setSelectedKey,
    setSelectedKeys,
    createObject,
    commitObjectWith,
  });

  useKeyboardShortcuts({ editingKey, onUndo: undo, onRedo: redo, onDelete: deleteSelected });

  // ---- Stage size --------------------------------------------------------

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setStageSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- Render loop -------------------------------------------------------

  const spatial = useMemo(() => new SpatialIndex(objects, 400), [objects]);

  const redraw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      const visibleRect = getVisibleWorldRect(stagePos, scale, width, height);
      renderer.draw({
        ctx,
        stagePos,
        scale,
        stageSize: { width, height },
        visibleRect,
        objects: filterObjectsForViewer({
          objects: spatial.query(visibleRect),
          layers,
          isObjectVisible: (key) => isObjectVisibleRef.current(key),
        }),
        layers,
        selectedKeys: selectedKeys.length ? selectedKeys : selectedKey ? [selectedKey] : [],
        primarySelectedKey: selectedKey,
        draftRect,
        draftShapeVariant: currentTool === "shape" ? activeShapeVariant : null,
        bringToFrontKeys: draggingKeys,
      });
    },
    [
      stagePos,
      scale,
      spatial,
      draftRect,
      currentTool,
      activeShapeVariant,
      selectedKey,
      selectedKeys,
      layers,
      draggingKeys,
    ]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || stageSize.width <= 0 || stageSize.height <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = stageSize.width;
    canvas.height = stageSize.height;
    redraw(ctx, stageSize.width, stageSize.height);
  }, [stageSize, stagePos, scale, objects, redraw, imageTick]);

  // ---- Editing scroll guard + focus -------------------------------------

  useEffect(() => {
    if (!editingKey) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [editingKey]);

  // Sync default layer to server only once for brand-new sessions (no layer rows yet).
  useEffect(() => {
    if (!id || loadStatus !== "loaded") return;
    if (!shouldSyncDefaultLayerRef.current) return;
    shouldSyncDefaultLayerRef.current = false;
    const base = layers.find((l) => l.id === "base");
    if (base) createLayer(base);
  }, [id, loadStatus, layers, createLayer]);

  // ---- Mouse handlers ----------------------------------------------------

  const dragSnapshotRef = useRef<
    Map<string, { obj: TabletopBaseObject; sortOrder: number }>
  >(new Map());

  const getCanvasPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const visibleObjects = useCallback(() => {
    const inView = spatial.query(
      getVisibleWorldRect(
        stagePosRef.current,
        scaleRef.current,
        stageSizeRef.current.width,
        stageSizeRef.current.height
      )
    );
    return filterObjectsForViewer({
      objects: inView,
      layers: layersRef.current,
      isObjectVisible: (key) => isObjectVisibleRef.current(key),
    });
  }, [spatial]);

  // Native wheel listener so we can preventDefault.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => e.preventDefault();
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (editingKey) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pointerX = ((e.clientX - rect.left) / rect.width) * stageSize.width;
      const pointerY = ((e.clientY - rect.top) / rect.height) * stageSize.height;

      const next = controllerRef.current?.wheelZoom({
        input: { deltaY: e.deltaY, pointer: { x: pointerX, y: pointerY } },
        stagePos,
        scale,
      });
      if (!next) return;
      setStagePos(next.stagePos);
      setScale(next.scale);
    },
    [editingKey, stagePos, scale, stageSize.width, stageSize.height]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (editingKey) return;

      // Middle-button pans.
      if (e.button === 1) {
        e.preventDefault();
        const pt = getCanvasPoint(e);
        if (!pt) return;
        setIsGrabbing(true);
        controllerRef.current?.startPan({ pointer: pt, stagePos: stagePosRef.current });
        return;
      }
      if (e.button !== 0) return;

      const pt = getCanvasPoint(e);
      if (!pt) return;
      setIsGrabbing(true);
      const world = screenToWorld(pt.x, pt.y, stagePosRef.current, scaleRef.current);

      if (currentTool === "shape" || currentTool === "text") {
        shapeDraft.current = { start: world, end: world };
        setDraftRect({ start: world, end: world });
        return;
      }

      const visible = visibleObjects();

      // Handles: pick before body hit-test (rotate handle sits outside the shape).
      if (currentTool === "select" && selectedKey) {
        const sel = objectsRef.current.find((o) => o.key === selectedKey);
        const meta = (sel?.obj.metadata as { kind?: string } | undefined) ?? {};
        if (sel && meta.kind !== "chip") {
          const lid = sel.obj.layerId ?? null;
          const layer = lid ? layersRef.current.find((l) => l.id === lid) : null;
          if (layer?.locked) return;
          const picked = pickHandle({
            obj: sel.obj,
            pointerScreen: pt,
            stagePos: stagePosRef.current,
            scale: scaleRef.current,
          });
          if (picked) {
            dragSnapshotRef.current = new Map([
              [selectedKey, { obj: cloneObj(sel.obj), sortOrder: sel.sortOrder }],
            ]);
            if (picked.kind === "rotate") {
              controllerRef.current?.startRotate({ key: selectedKey, obj: sel.obj, world });
            } else {
              controllerRef.current?.startResize({
                key: selectedKey,
                obj: sel.obj,
                handle: picked.handle,
                world,
              });
            }
            return;
          }
        }
      }

      const hit = hitObject(world.x, world.y, visible);
      if (hit) {
        const lid = hit.obj.layerId ?? null;
        const layer = lid ? layersRef.current.find((l) => l.id === lid) : null;
        const wasMulti = selectedKeys.length > 1;
        const inMulti = wasMulti && selectedKeys.includes(hit.key);

        if (!hit.obj.groupId && e.ctrlKey) {
          setSelectedKey(hit.key);
          setSelectedKeys((prev) =>
            prev.includes(hit.key) ? prev.filter((k) => k !== hit.key) : [...prev, hit.key]
          );
        } else if (inMulti && !e.shiftKey) {
          setSelectedKey(hit.key);
        } else {
          const objectsForSel = objectsRef.current.map((o) => ({
            key: o.key,
            groupId: o.obj.groupId ?? null,
          }));
          const sel = controllerRef.current?.computeSelection({
            hit: { key: hit.key, groupId: hit.obj.groupId ?? null },
            shiftKey: e.shiftKey,
            objects: objectsForSel,
          }) ?? { selectedKey: hit.key, selectedKeys: [hit.key] };
          setSelectedKey(sel.selectedKey);
          if (!hit.obj.groupId && e.shiftKey) {
            setSelectedKeys((prev) =>
              prev.includes(hit.key) ? prev.filter((k) => k !== hit.key) : [...prev, hit.key]
            );
          } else {
            setSelectedKeys(sel.selectedKeys);
          }
        }

        if (layer?.locked) return;

        dragObjectKey.current = hit.key;
        dragStartObjPos.current = {
          x: hit.obj.transform.position.x,
          y: hit.obj.transform.position.y,
        };
        const keys =
          selectedKeys.length > 1 && selectedKeys.includes(hit.key)
            ? selectedKeys
            : hit.obj.groupId
              ? objectsRef.current
                  .filter((o) => o.obj.groupId === hit.obj.groupId)
                  .map((o) => o.key)
              : [hit.key];
        setDraggingKeys(keys);
        controllerRef.current?.startDrag({
          keys,
          startWorld: world,
          objects: objectsRef.current.map((o) => ({
            key: o.key,
            x: o.obj.transform.position.x,
            y: o.obj.transform.position.y,
          })),
        });
        const snap = new Map<string, { obj: TabletopBaseObject; sortOrder: number }>();
        for (const k of keys) {
          const cur = objectsRef.current.find((o) => o.key === k);
          if (cur) snap.set(k, { obj: cloneObj(cur.obj), sortOrder: cur.sortOrder });
        }
        dragSnapshotRef.current = snap;
        lastWorldRef.current = world;
        return;
      }

      if (currentTool === "select") {
        selectionDraftRef.current = { start: world, end: world };
        setDraftRect({ start: world, end: world });
        return;
      }

      setSelectedKey(null);
      setSelectedKeys([]);
    },
    [editingKey, getCanvasPoint, currentTool, selectedKey, selectedKeys, visibleObjects]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (editingKey) return;
      if (!isGrabbing) return;
      const pt = getCanvasPoint(e);
      if (!pt) return;
      const world = screenToWorld(pt.x, pt.y, stagePosRef.current, scaleRef.current);

      if (shapeDraft.current && (currentTool === "shape" || currentTool === "text")) {
        shapeDraft.current = { ...shapeDraft.current, end: world };
        setDraftRect({ ...shapeDraft.current });
        return;
      }

      if (selectionDraftRef.current && currentTool === "select") {
        selectionDraftRef.current = { ...selectionDraftRef.current, end: world };
        setDraftRect({ ...selectionDraftRef.current });
        return;
      }

      const next = controllerRef.current?.moveTransform({ world, objects: objectsRef.current }) ?? null;
      if (next) {
        setObjects(next);
        return;
      }

      if (dragObjectKey.current) {
        const move = controllerRef.current?.moveDrag({ world }) ?? null;
        if (!move) return;
        setObjects((prev) => controllerRef.current!.applyDragToObjects(prev, move));
        lastWorldRef.current = world;
        return;
      }

      const nextPan = controllerRef.current?.movePan({ pointer: pt }) ?? null;
      if (nextPan) setStagePos(nextPan);
    },
    [editingKey, getCanvasPoint, currentTool, isGrabbing]
  );

  const handleMouseUp = useCallback(() => {
    if (!id) return;

    if (selectionDraftRef.current && currentTool === "select") {
      const { start, end } = selectionDraftRef.current;
      const r = {
        left: Math.min(start.x, end.x),
        top: Math.min(start.y, end.y),
        right: Math.max(start.x, end.x),
        bottom: Math.max(start.y, end.y),
      };
      selectionDraftRef.current = null;
      setDraftRect(null);

      const picked = visibleObjects().filter((o) => objectInRect(o, r));
      const keys = picked.map((o) => o.key);
      setSelectedKeys(keys);
      setSelectedKey(keys[0] ?? null);
    }

    if (shapeDraft.current && currentTool === "shape") {
      const { start, end } = shapeDraft.current;
      const left = Math.min(start.x, end.x);
      const top = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      shapeDraft.current = null;
      setDraftRect(null);

      if (w >= 4 && h >= 4) {
        const key = nextObjectKey("shape");
        const obj = createTabletopShape(
          activeShapeVariant,
          { x: left, y: top, width: w, height: h },
          { key, fillColor: "#60a5fa" }
        );
        createObject(key, obj);
      }
    }

    if (shapeDraft.current && currentTool === "text") {
      const { start, end } = shapeDraft.current;
      const left = Math.min(start.x, end.x);
      const top = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      shapeDraft.current = null;
      setDraftRect(null);

      if (w >= 10 && h >= 10) {
        const key = nextObjectKey("text");
        const obj = toTabletopText({ key, x: left, y: top, width: w, height: h, text: "" });
        createObject(key, obj);
        setEditingKey(key);
        setEditingText("");
      }
    }

    const transformKey = controllerRef.current?.endTransform();
    if (transformKey) {
      const cur = objectsRef.current.find((o) => o.key === transformKey);
      if (cur) commitObjectWith(transformKey, cur.obj);
    }

    const draggedKey = dragObjectKey.current;
    if (draggedKey) {
      const movedKeys = controllerRef.current?.endDrag() ?? [draggedKey];
      if (movedKeys.length > 0) commitObjectsBatch(movedKeys);

      const touched = movedKeys
        .map((k) => objectsRef.current.find((o) => o.key === k))
        .filter(Boolean) as TableObjectState[];
      if (touched.length > 0) {
        const before = dragSnapshotRef.current;
        if (before && before.size > 0) {
          const undoOps = [];
          const redoOps = [];
          for (const [k, snap] of before.entries()) {
            const after = objectsRef.current.find((o) => o.key === k);
            if (!after) continue;
            undoOps.push({
              kind: "restore" as const,
              key: k,
              obj: snap.obj,
              sortOrder: snap.sortOrder,
            });
            redoOps.push({
              kind: "restore" as const,
              key: k,
              obj: cloneObj(after.obj),
              sortOrder: after.sortOrder,
            });
          }
          if (undoOps.length > 0) pushHistory({ undo: undoOps, redo: redoOps });
        }
      }
    }

    setIsGrabbing(false);
    setDraggingKeys([]);
    controllerRef.current?.endPan();
    dragObjectKey.current = null;
    dragStartObjPos.current = null;
    dragSnapshotRef.current = new Map();
    lastWorldRef.current = null;
  }, [
    id,
    currentTool,
    activeShapeVariant,
    createObject,
    commitObjectWith,
    commitObjectsBatch,
    pushHistory,
    visibleObjects,
  ]);

  const handleMouseLeave = useCallback(() => handleMouseUp(), [handleMouseUp]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (editingKey) return;
      const pt = getCanvasPoint(e);
      if (!pt) return;
      const world = screenToWorld(pt.x, pt.y, stagePosRef.current, scaleRef.current);
      const hit = hitObject(world.x, world.y, visibleObjects());
      if (hit && hit.obj.type === "text") {
        setSelectedKey(hit.key);
        setEditingKey(hit.key);
        setEditingText(hit.obj.text?.text ?? "");
      }
    },
    [editingKey, getCanvasPoint, visibleObjects]
  );

  // ---- Misc UI actions ---------------------------------------------------

  const onAddLayer = useCallback(() => {
    const newId = `l-${Date.now()}`;
    createLayer({
      id: newId,
      key: layerKey(newId),
      version: 1,
      name: `Layer ${layers.length + 1}`,
      order: layers.length,
      visible: true,
      locked: false,
    });
    if (!activeLayerId) setActiveLayerId(newId);
  }, [createLayer, layers.length, activeLayerId]);

  const onReorderLayers = useCallback(
    (orderedIds: string[]) => {
      const byId = new Map(layers.map((l) => [l.id, l]));
      orderedIds.forEach((layerId, index) => {
        const layer = byId.get(layerId);
        if (layer && layer.order !== index) {
          updateLayer({ ...layer, order: index });
        }
      });
    },
    [layers, updateLayer]
  );

  const updateObjectLocal = useCallback(
    (key: string, updater: (o: TableObjectState) => TableObjectState) => {
      const next = objectsRef.current.map((o) => (o.key === key ? updater(o) : o));
      objectsRef.current = next;
      setObjects(next);
    },
    []
  );

  // ---- Selection-derived view models ------------------------------------

  const selected = selectedKey ? objects.find((o) => o.key === selectedKey) ?? null : null;
  const selectedLayer =
    selected && selected.obj.layerId
      ? layers.find((l) => l.id === selected.obj.layerId) ?? null
      : null;

  const groupSelection = useCallback(() => {
    if (selectedKeys.length < 2) return;
    const gid = `g-${Date.now()}`;
    selectedKeys.forEach((k) => {
      updateObjectLocal(k, (o) => ({ ...o, obj: { ...o.obj, groupId: gid } }));
      commitObject(k);
    });
  }, [selectedKeys, updateObjectLocal, commitObject]);

  const ungroupSelection = useCallback(() => {
    if (!selected) return;
    const gid = selected.obj.groupId;
    if (!gid) return;
    objectsRef.current
      .filter((o) => o.obj.groupId === gid)
      .forEach((o) => {
        updateObjectLocal(o.key, (x) => ({ ...x, obj: { ...x.obj, groupId: null } }));
        commitObject(o.key);
      });
    setSelectedKeys([selected.key]);
  }, [selected, updateObjectLocal, commitObject]);

  // ---- Render ------------------------------------------------------------

  const editingObject = editingKey ? objects.find((o) => o.key === editingKey) ?? null : null;

  const handleAccessChanged = useCallback(async () => {
    await sessionAccess.refetch();
    const parsed = await fetchFull();
    if (parsed) applyData(parsed);
  }, [sessionAccess, fetchFull, applyData]);

  return (
    <>
      <div className="st-viewport">
      <div
        ref={containerRef}
        className="st-canvas-host"
        style={{
          cursor:
            currentTool === "shape" || currentTool === "text"
              ? "crosshair"
              : isGrabbing
                ? "grabbing"
                : "default",
        }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!id || editingKey) return;
            const files = Array.from(e.dataTransfer.files || []);
            const img = files.find((f) => f.type.startsWith("image/"));
            if (!img) return;
            const reader = new FileReader();
            reader.onload = () => {
              const sprite = typeof reader.result === "string" ? reader.result : "";
              if (sprite) void importImageSprite(sprite);
            };
            reader.readAsDataURL(img);
          }}
        >
          <div style={{ width: "100%", height: "100%" }}>
          <TableContextMenu
            onOpenChange={(open) => {
              if (!open) contextKeyRef.current = null;
            }}
            onCopy={() => void copySelection()}
            onPaste={() => void pasteSelection()}
            onDelete={() => {
              const key = contextKeyRef.current;
              if (key) {
                setSelectedKey(key);
                setSelectedKeys([key]);
              }
              deleteSelected();
            }}
            trigger={
              <canvas
                ref={canvasRef}
                width={stageSize.width}
                height={stageSize.height}
                className="st-canvas"
                onWheel={handleWheel}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!id || editingKey) return;
                  const files = Array.from(e.dataTransfer.files || []);
                  const img = files.find((f) => f.type.startsWith("image/"));
                  if (!img) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const sprite = typeof reader.result === "string" ? reader.result : "";
                    if (sprite) void importImageSprite(sprite);
                  };
                  reader.readAsDataURL(img);
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onDoubleClick={handleDoubleClick}
                onContextMenu={(e) => {
                  if (editingKey) {
                    e.preventDefault();
                    return;
                  }
                  if (isGrabbing) {
                    e.preventDefault();
                    return;
                  }
                  const pt = getCanvasPoint(e);
                  if (!pt) return;
                  const world = screenToWorld(pt.x, pt.y, stagePosRef.current, scaleRef.current);
                  const hit = hitObject(world.x, world.y, visibleObjects());
                  const key = hit?.key ?? (selectedKey ?? selectedKeys[0] ?? null);
                  if (!key) {
                    e.preventDefault();
                    contextKeyRef.current = null;
                    return;
                  }
                  setSelectedKey(key);
                  setSelectedKeys([key]);
                  contextKeyRef.current = key;
                }}
              />
            }
          />
          </div>

          {editingObject && (
            <TextEditOverlay
              editingObject={editingObject}
              editingText={editingText}
              setEditingText={setEditingText}
              stagePos={stagePosRef.current}
              scale={scaleRef.current}
              canvasRef={canvasRef}
              stageSize={stageSize}
              onCancel={() => {
                setEditingKey(null);
                setEditingText("");
              }}
              onCommit={(text) => {
                const current = objectsRef.current.find((x) => x.key === editingKey);
                if (current) {
                  const nextObj: TabletopBaseObject = {
                    ...current.obj,
                    text: { ...(current.obj.text ?? {}), text } as TabletopBaseObject["text"],
                  };
                  commitObjectWith(current.key, nextObj);
                }
                setEditingKey(null);
              }}
            />
          )}
      </div>
      </div>

      <SessionChrome
        loadStatus={loadStatus}
        syncStatus={syncStatus}
        onFlushNow={flushNow}
        onOpenTeams={() => setTeamsOpen((v) => !v)}
        teamsOpen={teamsOpen}
      />

      {sessionAccess.access && id && (
        <TeamSettingsPanel
          sessionId={id}
          access={sessionAccess.access}
          canManage={sessionAccess.canManageTeams}
          open={teamsOpen}
          onToggleOpen={() => setTeamsOpen(false)}
          onChanged={handleAccessChanged}
        />
      )}

      <ToolsToolbar
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        activeShapeVariant={activeShapeVariant}
        onShapeVariantChange={setActiveShapeVariant}
      />

      <InspectorPanel
        open={inspectorOpen}
        onToggleOpen={() => setInspectorOpen((v) => !v)}
        selected={selected}
        selectedLayer={selectedLayer}
        selectedKeys={selectedKeys}
        layers={layers}
        activeLayerId={activeLayerId}
        onActivateLayer={setActiveLayerId}
        onAddLayer={onAddLayer}
        onToggleLayerVisible={(l) => updateLayer({ ...l, visible: !l.visible })}
        onToggleLayerLocked={(l) => updateLayer({ ...l, locked: !l.locked })}
        onReorderLayers={onReorderLayers}
        onUpdateLocal={updateObjectLocal}
        onCommit={commitObject}
        onCommitWith={commitObjectWith}
        getObjectByKey={(key) => objectsRef.current.find((o) => o.key === key)?.obj ?? null}
        onGroup={groupSelection}
        onUngroup={ungroupSelection}
        sessionId={id}
        access={sessionAccess.access}
        canManagePermissions={sessionAccess.canManageTeams}
        onAccessChanged={handleAccessChanged}
      />
    </>
  );
}
