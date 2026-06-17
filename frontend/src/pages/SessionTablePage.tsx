import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { TabletopBaseObject } from "@dnd-table/shared";

import { CanvasRenderer } from "../tabletop/render/CanvasRenderer";
import { SpatialIndex } from "../tabletop/spatial";
import { getVisibleWorldRect } from "../tabletop/geometry";
import { TableController } from "../tabletop/controller/TableController";
import {
  type Layer,
  type TableObjectState,
  type Tool,
} from "../tabletop/model";
import { type ShapeVariantId } from "../tabletop/shapes";
import {
  applyBroadcastToLayers,
  applyBroadcastToObjects,
  appliedOpsIncludeSprites,
  cloneObj,
  resolveLayersFromSession,
  type ParsedSession,
} from "./sessionTable/helpers";
import type { AppliedOp, PatchConflict } from "../tabletop/realtime/TableSync";
import { sanitizePropsForSync } from "../tabletop/sync/ObjectMutationPlanner";
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
import { useTableCanvasInput } from "./sessionTable/hooks/useTableCanvasInput";
import { LongPressIndicator } from "./sessionTable/panels/LongPressIndicator";
import { MobileActionMenu, type MobileMenuState } from "./sessionTable/panels/MobileActionMenu";
import { useCoarsePointer } from "../hooks/useCoarsePointer";
import { filterObjectsForViewer } from "../tabletop/visibility";
import { getSocket } from "../realtime/socket";
import { Alert, Button, Modal } from "../components/ui";
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
  const localEditBeforeRef = useRef(
    new Map<string, { obj: TabletopBaseObject; sortOrder: number }>()
  );
  const resetUnackedCreatesRef = useRef<() => void>(() => {});
  const registerUnackedCreatesRef = useRef<(keys: string[]) => void>(() => {});
  const getPendingCreateKeysRef = useRef<() => string[]>(() => []);
  const upsertUnackedCreateRef = useRef<
    (key: string, object: import("../tabletop/realtime/TableSync").UnackedObjectDto) => void
  >(() => {});
  const flushNowRef = useRef<() => void>(() => {});
  const onBroadcastImplRef = useRef<(applied: AppliedOp[]) => void>(() => {});
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
  /** Selection snapshot when context menu opens (supports multi-select). */
  const contextMenuKeysRef = useRef<string[]>([]);
  const selectionDraftRef = useRef<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);

  const primarySelectionKey = selectedKey ?? selectedKeys[0] ?? null;

  const [imageTick, setImageTick] = useState(0);
  const [spriteError, setSpriteError] = useState<string | null>(null);
  const [layerDeleteConfirm, setLayerDeleteConfirm] = useState<{
    layer: Layer;
    objectCount: number;
  } | null>(null);
  const [draftRect, setDraftRect] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [draggingKeys, setDraggingKeys] = useState<string[]>([]);
  const shouldSyncDefaultLayerRef = useRef(false);

  const dragObjectKey = useRef<string | null>(null);
  const shapeDraft = useRef<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);
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
  const isCoarsePointer = useCoarsePointer();
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(() => !isCoarsePointer);
  const [mobileMenu, setMobileMenu] = useState<MobileMenuState>({
    open: false,
    x: 0,
    y: 0,
  });
  const [contextMenuTargetKeys, setContextMenuTargetKeys] = useState<string[]>([]);
  const isObjectVisibleRef = useRef(sessionAccess.isObjectVisible);
  useEffect(() => {
    isObjectVisibleRef.current = sessionAccess.isObjectVisible;
  }, [sessionAccess.isObjectVisible]);

  // ---- History & mutations ----------------------------------------------

  const { push: pushHistory, undo: undoHistory, redo: redoHistory, clear: clearHistory, canUndo, canRedo } =
    useTableHistory();

  const applyDataWithHistoryClear = useCallback(
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
      layersRef.current = resolvedLayers;
      setActiveLayerId((prev) => prev ?? resolvedLayers[0]?.id ?? null);
      setObjects(parsed.objects);
      objectsRef.current = parsed.objects;
      localEditBeforeRef.current.clear();
      resetUnackedCreatesRef.current();
      clearHistory();
      sessionAccess.setFromFull(parsed.access, parsed.viewer);
    },
    [clearHistory, sessionAccess.setFromFull]
  );

  const { loadStatus, fetchFull } = useTableData(id);
  useInitialLoad(id, fetchFull, applyDataWithHistoryClear);

  const onConflict = useCallback(async (conflicts: PatchConflict[]) => {
    const pendingBefore = getPendingCreateKeysRef.current();
    const localUnacked = objectsRef.current.filter((o) => pendingBefore.includes(o.key));
    const localSnap = new Map(localUnacked.map((o) => [o.key, o]));

    const parsed = await fetchFull();
    if (!parsed) return;

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
    layersRef.current = resolvedLayers;
    setActiveLayerId((prev) => prev ?? resolvedLayers[0]?.id ?? null);

    const serverKeys = new Set(parsed.objects.map((o) => o.key));
    const preserved = localUnacked.filter((o) => !serverKeys.has(o.key));
    const mergedObjects = [...parsed.objects, ...preserved];
    setObjects(mergedObjects);
    objectsRef.current = mergedObjects;
    localEditBeforeRef.current.clear();

    resetUnackedCreatesRef.current();
    if (preserved.length > 0) {
      registerUnackedCreatesRef.current(preserved.map((o) => o.key));
    }

    sessionAccess.setFromFull(parsed.access, parsed.viewer);

    for (const c of conflicts) {
      if (c.actualVersion !== null) {
        const actual = c.actualVersion;
        setObjects((prev) => {
          const next = prev.map((o) => (o.key === c.key ? { ...o, version: actual } : o));
          objectsRef.current = next;
          return next;
        });
        continue;
      }
      const local = localSnap.get(c.key);
      if (!local) continue;
      const sanitized = sanitizePropsForSync(local.obj);
      if (!sanitized.ok) continue;
      upsertUnackedCreateRef.current(c.key, {
        type: local.obj.type,
        x: local.obj.transform.position.x,
        y: local.obj.transform.position.y,
        sortOrder: local.sortOrder,
        props: sanitized.props,
      });
      registerUnackedCreatesRef.current([c.key]);
    }

    const lost = pendingBefore.filter((k) => !mergedObjects.some((o) => o.key === k));
    if (lost.length > 0) {
      setSpriteError(
        "Объект ещё сохранялся на сервере. Подождите синхронизацию и повторите действие."
      );
    }

    flushNowRef.current();
  }, [fetchFull, sessionAccess.setFromFull]);

  const onBroadcast = useCallback(
    (applied: AppliedOp[]) => onBroadcastImplRef.current(applied),
    []
  );

  const {
    syncStatus,
    enqueueOps,
    flushNow,
    amendUnackedUpdate,
    upsertUnackedCreate,
    cancelUnackedCreate,
  } = useTableSync({
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

  const onSpriteError = useCallback((message: string) => {
    setSpriteError(message);
  }, []);

  const {
    createObject,
    createObjectsBatch,
    commitObject,
    commitObjectWith,
    commitObjectsBatch,
    deleteObjects,
    applyHistoryOps,
    createLayer,
    updateLayer,
    deleteLayer,
    reorderLayers,
    pushRestoreBatch,
    noteCreatesAcked,
    resetUnackedCreates,
    registerUnackedCreates,
    getPendingCreateKeys,
  } = useObjectMutations({
    enqueueOps,
    amendUnackedUpdate,
    upsertUnackedCreate,
    cancelUnackedCreate,
    pushHistory,
    activeLayerId,
    objectsRef,
    layersRef,
    setObjects,
    setLayers,
    setSelectedKey,
    setSelectedKeys,
    localEditBeforeRef,
    canPerform: sessionAccess.can,
    onPropsSyncRejected: onSpriteError,
  });

  onBroadcastImplRef.current = (applied) => {
    noteCreatesAcked(applied);
    setLayers((prev) => applyBroadcastToLayers(prev, applied));
    setObjects((prev) => {
      const next = applyBroadcastToObjects(prev, applied);
      objectsRef.current = next;
      return next;
    });
    if (appliedOpsIncludeSprites(applied)) {
      setImageTick((t) => t + 1);
    }
  };
  resetUnackedCreatesRef.current = resetUnackedCreates;
  registerUnackedCreatesRef.current = registerUnackedCreates;
  getPendingCreateKeysRef.current = getPendingCreateKeys;
  upsertUnackedCreateRef.current = upsertUnackedCreate;
  flushNowRef.current = flushNow;

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
    contextMenuKeysRef.current = [];
    deleteObjects(keys);
  }, [selectedKey, selectedKeys, deleteObjects]);

  // ---- Copy/paste --------------------------------------------------------

  const { copyKeys, pasteSelection, importImageSprite } = useCopyPaste({
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
    createObjectsBatch,
    commitObjectWith,
    onSpriteError,
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

  const handleMobileMenuOpen = useCallback(
    (menu: MobileMenuState, keys: string[]) => {
      contextMenuKeysRef.current = keys;
      setMobileMenu(menu);
    },
    []
  );

  const { longPressRing, canvasHandlers } = useTableCanvasInput({
    canvasRef,
    controllerRef,
    isCoarsePointer,
    id,
    editingKey,
    currentTool,
    activeShapeVariant,
    selectedKey,
    selectedKeys,
    stagePos,
    scale,
    stageSize,
    isGrabbing,
    setIsGrabbing,
    setStagePos,
    setScale,
    setObjects,
    setSelectedKey,
    setSelectedKeys,
    setDraftRect,
    setDraggingKeys,
    setEditingKey,
    setEditingText,
    objectsRef,
    layersRef,
    stagePosRef,
    scaleRef,
    stageSizeRef,
    selectionDraftRef,
    shapeDraft,
    dragObjectKey,
    contextMenuKeysRef,
    visibleObjects,
    createObject,
    commitObjectWith,
    commitObjectsBatch,
    pushHistory,
    onMobileMenuOpen: handleMobileMenuOpen,
    onContextMenuKeysChange: setContextMenuTargetKeys,
  });

  const menuTargetKey = contextMenuTargetKeys[0] ?? primarySelectionKey;
  const menuTargetObj = objects.find((o) => o.key === menuTargetKey)?.obj ?? null;
  const showEditInMenu =
    contextMenuTargetKeys.length === 1 && menuTargetObj?.type === "text";

  const handleEditFromMenu = useCallback(() => {
    const key = contextMenuTargetKeys[0] ?? primarySelectionKey;
    if (!key) return;
    const obj = objectsRef.current.find((o) => o.key === key);
    if (obj?.obj.type === "text") {
      setSelectedKey(key);
      setEditingKey(key);
      setEditingText(obj.obj.text?.text ?? "");
    }
  }, [contextMenuTargetKeys, primarySelectionKey, setSelectedKey, setEditingKey, setEditingText, objectsRef]);

  const handleAddPhoto = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const sprite = typeof reader.result === "string" ? reader.result : "";
        if (sprite) void importImageSprite(sprite);
      };
      reader.readAsDataURL(file);
    },
    [importImageSprite]
  );

  const panelBackdropOpen = isCoarsePointer && (teamsOpen || inspectorOpen);

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
      reorderLayers(orderedIds);
    },
    [reorderLayers]
  );

  const performDeleteLayer = useCallback(
    (layer: Layer) => {
      const objectKeys = objectsRef.current
        .filter((o) => o.obj.layerId === layer.id)
        .map((o) => o.key);
      if (objectKeys.length > 0) {
        deleteObjects(objectKeys);
      }
      deleteLayer(layer);
      if (activeLayerId === layer.id) {
        const remaining = layersRef.current.filter((l) => l.id !== layer.id);
        setActiveLayerId(remaining[0]?.id ?? null);
      }
      setLayerDeleteConfirm(null);
    },
    [activeLayerId, deleteLayer, deleteObjects]
  );

  const onRequestDeleteLayer = useCallback(
    (layer: Layer) => {
      if (layers.length <= 1) return;
      if (layer.locked) return;
      const objectCount = objectsRef.current.filter((o) => o.obj.layerId === layer.id).length;
      if (objectCount === 0) {
        performDeleteLayer(layer);
        return;
      }
      setLayerDeleteConfirm({ layer, objectCount });
    },
    [layers.length, performDeleteLayer]
  );

  const updateObjectLocal = useCallback(
    (key: string, updater: (o: TableObjectState) => TableObjectState) => {
      if (!localEditBeforeRef.current.has(key)) {
        const cur = objectsRef.current.find((o) => o.key === key);
        if (cur) {
          localEditBeforeRef.current.set(key, {
            obj: cloneObj(cur.obj),
            sortOrder: cur.sortOrder,
          });
        }
      }
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
    const historyEntries: Array<{
      key: string;
      before: { obj: TabletopBaseObject; sortOrder: number };
      after: { obj: TabletopBaseObject; sortOrder: number };
    }> = [];
    selectedKeys.forEach((k) => {
      const cur = objectsRef.current.find((o) => o.key === k);
      if (!cur) return;
      const before = { obj: cloneObj(cur.obj), sortOrder: cur.sortOrder };
      updateObjectLocal(k, (o) => ({ ...o, obj: { ...o.obj, groupId: gid } }));
      const afterObj = objectsRef.current.find((o) => o.key === k);
      if (afterObj) {
        historyEntries.push({
          key: k,
          before,
          after: { obj: cloneObj(afterObj.obj), sortOrder: afterObj.sortOrder },
        });
      }
      commitObject(k, { skipHistory: true });
      localEditBeforeRef.current.delete(k);
    });
    pushRestoreBatch(historyEntries);
  }, [selectedKeys, updateObjectLocal, commitObject, pushRestoreBatch]);

  const ungroupSelection = useCallback(() => {
    if (!selected) return;
    const gid = selected.obj.groupId;
    if (!gid) return;
    const keys = objectsRef.current.filter((o) => o.obj.groupId === gid).map((o) => o.key);
    const historyEntries: Array<{
      key: string;
      before: { obj: TabletopBaseObject; sortOrder: number };
      after: { obj: TabletopBaseObject; sortOrder: number };
    }> = [];
    keys.forEach((k) => {
      const cur = objectsRef.current.find((o) => o.key === k);
      if (!cur) return;
      const before = { obj: cloneObj(cur.obj), sortOrder: cur.sortOrder };
      updateObjectLocal(k, (x) => ({ ...x, obj: { ...x.obj, groupId: null } }));
      const afterObj = objectsRef.current.find((o) => o.key === k);
      if (afterObj) {
        historyEntries.push({
          key: k,
          before,
          after: { obj: cloneObj(afterObj.obj), sortOrder: afterObj.sortOrder },
        });
      }
      commitObject(k, { skipHistory: true });
      localEditBeforeRef.current.delete(k);
    });
    pushRestoreBatch(historyEntries);
    setSelectedKeys([selected.key]);
  }, [selected, updateObjectLocal, commitObject, pushRestoreBatch]);

  // ---- Render ------------------------------------------------------------

  const editingObject = editingKey ? objects.find((o) => o.key === editingKey) ?? null : null;

  const handleAccessChanged = useCallback(async () => {
    await sessionAccess.refetch();
    const parsed = await fetchFull();
    if (parsed) applyDataWithHistoryClear(parsed);
  }, [sessionAccess, fetchFull, applyDataWithHistoryClear]);

  return (
    <>
      {panelBackdropOpen && (
        <button
          type="button"
          className="st-panel-backdrop"
          aria-label="Закрыть панель"
          onClick={() => {
            setTeamsOpen(false);
            setInspectorOpen(false);
          }}
        />
      )}

      {longPressRing && (
        <LongPressIndicator clientX={longPressRing.clientX} clientY={longPressRing.clientY} />
      )}

      <MobileActionMenu
        menu={mobileMenu}
        showEdit={showEditInMenu}
        onClose={() => setMobileMenu((m) => ({ ...m, open: false }))}
        onCopy={() => void copyKeys(contextMenuKeysRef.current)}
        onPaste={() => void pasteSelection()}
        onEdit={handleEditFromMenu}
        onDelete={() => {
          const keys = contextMenuKeysRef.current;
          if (keys.length === 0) return;
          contextMenuKeysRef.current = [];
          deleteObjects(keys);
        }}
      />

      <div className="st-viewport">
        <div className="st-atmosphere-back" aria-hidden="true">
          <div className="st-atmosphere__blobs" />
          <div className="st-atmosphere__center-glow" />
        </div>
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
            showEdit={showEditInMenu}
            onOpenChange={(open) => {
              if (!open) {
                contextMenuKeysRef.current = [];
                setContextMenuTargetKeys([]);
              }
            }}
            onCopy={() => void copyKeys(contextMenuKeysRef.current)}
            onPaste={() => void pasteSelection()}
            onEdit={handleEditFromMenu}
            onDelete={() => {
              const keys = contextMenuKeysRef.current;
              if (keys.length === 0) return;
              contextMenuKeysRef.current = [];
              deleteObjects(keys);
            }}
            trigger={
              <canvas
                ref={canvasRef}
                width={stageSize.width}
                height={stageSize.height}
                className="st-canvas"
                onWheel={canvasHandlers.onWheel}
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
                onPointerDown={canvasHandlers.onPointerDown}
                onPointerMove={canvasHandlers.onPointerMove}
                onPointerUp={canvasHandlers.onPointerUp}
                onPointerCancel={canvasHandlers.onPointerCancel}
                onPointerLeave={canvasHandlers.onPointerLeave}
                onDoubleClick={canvasHandlers.onDoubleClick}
                onContextMenu={canvasHandlers.onContextMenu}
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
              isCoarsePointer={isCoarsePointer}
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
        <div className="st-atmosphere-front" aria-hidden="true">
          <div className="st-atmosphere__vignette" />
          <div className="st-atmosphere__grain" />
        </div>
      </div>

      <SessionChrome
        loadStatus={loadStatus}
        syncStatus={syncStatus}
        onFlushNow={flushNow}
        onOpenTeams={() => setTeamsOpen((v) => !v)}
        teamsOpen={teamsOpen}
        isCoarsePointer={isCoarsePointer}
        inspectorOpen={inspectorOpen}
        onOpenInspector={() => setInspectorOpen((v) => !v)}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo()}
        canRedo={canRedo()}
        onDelete={deleteSelected}
        canDelete={selectedKeys.length > 0 || Boolean(selectedKey)}
        onAddPhoto={handleAddPhoto}
      />

      {spriteError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] pointer-events-auto">
          <Alert variant="error">
            <div className="flex items-start justify-between gap-2">
              <span>{spriteError}</span>
              <button
                type="button"
                className="text-error/80 hover:text-error shrink-0 text-xs"
                onClick={() => setSpriteError(null)}
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>
          </Alert>
        </div>
      )}

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
        onDeleteLayer={onRequestDeleteLayer}
        canDeleteLayers={layers.length > 1}
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
        onSpriteError={onSpriteError}
        currentTool={currentTool}
        activeShapeVariant={activeShapeVariant}
        onShapeVariantChange={setActiveShapeVariant}
      />

      <Modal
        open={layerDeleteConfirm !== null}
        onClose={() => setLayerDeleteConfirm(null)}
        title="Удалить слой?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLayerDeleteConfirm(null)}>
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (layerDeleteConfirm) performDeleteLayer(layerDeleteConfirm.layer);
              }}
            >
              Удалить
            </Button>
          </>
        }
      >
        {layerDeleteConfirm && (
          <p className="text-text-secondary">
            На слое «{layerDeleteConfirm.layer.name}»{" "}
            {layerDeleteConfirm.objectCount}{" "}
            {layerDeleteConfirm.objectCount === 1
              ? "объект"
              : layerDeleteConfirm.objectCount < 5
                ? "объекта"
                : "объектов"}
            . Удалить слой вместе со всем содержимым? Это действие нельзя отменить.
          </p>
        )}
      </Modal>
    </>
  );
}
