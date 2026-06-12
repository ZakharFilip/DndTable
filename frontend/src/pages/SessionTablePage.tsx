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
import { useTableCanvasInput } from "./sessionTable/hooks/useTableCanvasInput";
import { LongPressIndicator } from "./sessionTable/panels/LongPressIndicator";
import { MobileActionMenu, type MobileMenuState } from "./sessionTable/panels/MobileActionMenu";
import { useCoarsePointer } from "../hooks/useCoarsePointer";
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
  /** Selection snapshot when context menu opens (supports multi-select). */
  const contextMenuKeysRef = useRef<string[]>([]);
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
        onDelete={deleteSelected}
        canDelete={selectedKeys.length > 0 || Boolean(selectedKey)}
        onAddPhoto={handleAddPhoto}
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
