import { useCallback, useRef, useState, type RefObject } from "react";
import type { TabletopBaseObject } from "@dnd-table/shared";
import type { TableController } from "../../../tabletop/controller/TableController";
import { pickHandle } from "../../../tabletop/controller/handles";
import {
  hitObject,
  objectInRect,
  screenToWorld,
} from "../../../tabletop/geometry";
import {
  nextObjectKey,
  toTabletopText,
  type Layer,
  type TableObjectState,
  type Tool,
} from "../../../tabletop/model";
import { createTabletopShape, type ShapeVariantId } from "../../../tabletop/shapes";
import { cloneObj } from "../helpers";
import {
  getCanvasPoint,
  midpoint,
  pointerDistance,
  type CanvasPoint,
} from "../input/canvasPoint";
import {
  currentSelectionKeys,
  resolveDesktopContextMenu,
  resolveLongPressMenu,
} from "../input/resolveContextMenu";
import type { MobileMenuState } from "../panels/MobileActionMenu";
import {
  composePinchStagePos,
  computePinchScaleFactor,
  DOUBLE_TAP_MS,
  isShortTap,
  LONG_PRESS_MS,
  movementExceeded,
  shouldInitPinchBaseline,
  shouldAllowPinch,
  TOUCH_HANDLE_PX,
  type TouchGesturePhase,
} from "../input/touchGesture";

export type LongPressRing = { clientX: number; clientY: number } | null;

export type UseTableCanvasInputParams = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  controllerRef: RefObject<TableController | null>;
  isCoarsePointer: boolean;
  id: string | undefined;
  editingKey: string | null;
  currentTool: Tool;
  activeShapeVariant: ShapeVariantId;
  selectedKey: string | null;
  selectedKeys: string[];
  stagePos: { x: number; y: number };
  scale: number;
  stageSize: { width: number; height: number };
  isGrabbing: boolean;
  setIsGrabbing: (v: boolean) => void;
  setStagePos: (p: { x: number; y: number }) => void;
  setScale: (s: number) => void;
  setObjects: React.Dispatch<React.SetStateAction<TableObjectState[]>>;
  setSelectedKey: (k: string | null) => void;
  setSelectedKeys: React.Dispatch<React.SetStateAction<string[]>>;
  setDraftRect: React.Dispatch<
    React.SetStateAction<{
      start: { x: number; y: number };
      end: { x: number; y: number };
    } | null>
  >;
  setDraggingKeys: (keys: string[]) => void;
  setEditingKey: (k: string | null) => void;
  setEditingText: (t: string) => void;
  objectsRef: RefObject<TableObjectState[]>;
  layersRef: RefObject<Layer[]>;
  stagePosRef: RefObject<{ x: number; y: number }>;
  scaleRef: RefObject<number>;
  stageSizeRef: RefObject<{ width: number; height: number }>;
  selectionDraftRef: RefObject<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>;
  shapeDraft: RefObject<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>;
  dragObjectKey: RefObject<string | null>;
  contextMenuKeysRef: RefObject<string[]>;
  visibleObjects: () => TableObjectState[];
  createObject: (key: string, obj: TabletopBaseObject) => void;
  commitObjectWith: (key: string, obj: TabletopBaseObject, opts?: { skipHistory?: boolean }) => void;
  commitObjectsBatch: (keys: string[]) => void;
  pushHistory: (entry: {
    undo: Array<{
      kind: "restore";
      key: string;
      obj: TabletopBaseObject;
      sortOrder: number;
    }>;
    redo: Array<{
      kind: "restore";
      key: string;
      obj: TabletopBaseObject;
      sortOrder: number;
    }>;
  }) => void;
  onMobileMenuOpen: (menu: MobileMenuState, menuKeys: string[]) => void;
  onContextMenuKeysChange: (keys: string[]) => void;
};

export function useTableCanvasInput(params: UseTableCanvasInputParams) {
  const {
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
    selectionDraftRef,
    shapeDraft,
    dragObjectKey,
    contextMenuKeysRef,
    visibleObjects,
    createObject,
    commitObjectWith,
    commitObjectsBatch,
    pushHistory,
    onMobileMenuOpen,
    onContextMenuKeysChange,
  } = params;

  const dragSnapshotRef = useRef<
    Map<string, { obj: TabletopBaseObject; sortOrder: number }>
  >(new Map());

  const [longPressRing, setLongPressRing] = useState<LongPressRing>(null);

  const touchPhaseRef = useRef<TouchGesturePhase>("idle");
  const touchPointerIdRef = useRef<number | null>(null);
  const touchStartCanvasRef = useRef<CanvasPoint | null>(null);
  const touchStartClientRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartTimeRef = useRef(0);
  const touchMovedRef = useRef(false);
  const touchLongPressFiredRef = useRef(false);
  const touchHadSelectionRef = useRef(false);
  const touchHitRef = useRef<TableObjectState | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; key: string | null }>({ time: 0, key: null });

  const activePointersRef = useRef<Map<number, CanvasPoint>>(new Map());
  const pinchStartDistanceRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const pinchStartStagePosRef = useRef({ x: 0, y: 0 });
  const pinchStartMidpointRef = useRef<CanvasPoint | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const resetTouchGesture = useCallback(() => {
    clearLongPressTimer();
    touchPhaseRef.current = "idle";
    touchPointerIdRef.current = null;
    touchStartCanvasRef.current = null;
    touchStartClientRef.current = null;
    touchMovedRef.current = false;
    touchLongPressFiredRef.current = false;
    touchHitRef.current = null;
    setLongPressRing(null);
  }, [clearLongPressTimer]);

  const finishInteraction = useCallback(() => {
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
      const before = dragSnapshotRef.current.get(transformKey);
      const cur = objectsRef.current?.find((o) => o.key === transformKey);
      if (cur) commitObjectWith(transformKey, cur.obj, { skipHistory: true });
      if (before && cur) {
        const after = objectsRef.current?.find((o) => o.key === transformKey);
        if (after) {
          pushHistory({
            undo: [
              {
                kind: "restore" as const,
                key: transformKey,
                obj: before.obj,
                sortOrder: before.sortOrder,
              },
            ],
            redo: [
              {
                kind: "restore" as const,
                key: transformKey,
                obj: cloneObj(after.obj),
                sortOrder: after.sortOrder,
              },
            ],
          });
        }
      }
    }

    const draggedKey = dragObjectKey.current;
    if (draggedKey) {
      const movedKeys = controllerRef.current?.endDrag() ?? [draggedKey];
      if (movedKeys.length > 0) commitObjectsBatch(movedKeys);
      const touched = movedKeys
        .map((k) => objectsRef.current?.find((o) => o.key === k))
        .filter(Boolean) as TableObjectState[];
      if (touched.length > 0) {
        const before = dragSnapshotRef.current;
        if (before && before.size > 0) {
          const undoOps = [];
          const redoOps = [];
          for (const [k, snap] of before.entries()) {
            const after = objectsRef.current?.find((o) => o.key === k);
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
    controllerRef.current?.endTwoFingerPan();
    dragObjectKey.current = null;
    dragSnapshotRef.current = new Map();
  }, [
    id,
    currentTool,
    activeShapeVariant,
    selectionDraftRef,
    shapeDraft,
    objectsRef,
    dragObjectKey,
    controllerRef,
    setDraftRect,
    visibleObjects,
    setSelectedKeys,
    setSelectedKey,
    createObject,
    setEditingKey,
    setEditingText,
    commitObjectWith,
    commitObjectsBatch,
    pushHistory,
    setIsGrabbing,
    setDraggingKeys,
  ]);

  const beginObjectDrag = useCallback(
    (
      hit: TableObjectState,
      world: { x: number; y: number },
      keys: string[]
    ) => {
      dragObjectKey.current = hit.key;
      setDraggingKeys(keys);
      controllerRef.current?.startDrag({
        keys,
        startWorld: world,
        objects: (objectsRef.current ?? []).map((o) => ({
          key: o.key,
          x: o.obj.transform.position.x,
          y: o.obj.transform.position.y,
        })),
      });
      const snap = new Map<string, { obj: TabletopBaseObject; sortOrder: number }>();
      for (const k of keys) {
        const cur = objectsRef.current?.find((o) => o.key === k);
        if (cur) snap.set(k, { obj: cloneObj(cur.obj), sortOrder: cur.sortOrder });
      }
      dragSnapshotRef.current = snap;
    },
    [controllerRef, objectsRef, dragObjectKey, setDraggingKeys]
  );

  const selectHit = useCallback(
    (hit: TableObjectState, shiftKey: boolean, ctrlKey: boolean) => {
      const wasMulti = selectedKeys.length > 1;
      const inMulti = wasMulti && selectedKeys.includes(hit.key);

      if (!hit.obj.groupId && ctrlKey) {
        setSelectedKey(hit.key);
        setSelectedKeys((prev) =>
          prev.includes(hit.key) ? prev.filter((k) => k !== hit.key) : [...prev, hit.key]
        );
        return;
      }
      if (inMulti && !shiftKey) {
        setSelectedKey(hit.key);
        return;
      }
      const objectsForSel = (objectsRef.current ?? []).map((o) => ({
        key: o.key,
        groupId: o.obj.groupId ?? null,
      }));
      const sel =
        controllerRef.current?.computeSelection({
          hit: { key: hit.key, groupId: hit.obj.groupId ?? null },
          shiftKey,
          objects: objectsForSel,
        }) ?? { selectedKey: hit.key, selectedKeys: [hit.key] };
      setSelectedKey(sel.selectedKey);
      if (!hit.obj.groupId && shiftKey) {
        setSelectedKeys((prev) =>
          prev.includes(hit.key) ? prev.filter((k) => k !== hit.key) : [...prev, hit.key]
        );
      } else {
        setSelectedKeys(sel.selectedKeys);
      }
    },
    [selectedKeys, objectsRef, controllerRef, setSelectedKey, setSelectedKeys]
  );

  const tryEditText = useCallback(
    (hit: TableObjectState) => {
      if (hit.obj.type !== "text") return;
      setSelectedKey(hit.key);
      setEditingKey(hit.key);
      setEditingText(hit.obj.text?.text ?? "");
    },
    [setSelectedKey, setEditingKey, setEditingText]
  );

  const handleDesktopPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (editingKey) return;
      if (e.button === 1) {
        e.preventDefault();
        const pt = getCanvasPoint(canvasRef.current, e.clientX, e.clientY);
        if (!pt) return;
        setIsGrabbing(true);
        controllerRef.current?.startPan({ pointer: pt, stagePos: stagePosRef.current! });
        return;
      }
      if (e.button !== 0) return;

      const pt = getCanvasPoint(canvasRef.current, e.clientX, e.clientY);
      if (!pt) return;
      setIsGrabbing(true);
      const world = screenToWorld(pt.x, pt.y, stagePosRef.current!, scaleRef.current!);

      if (currentTool === "shape" || currentTool === "text") {
        shapeDraft.current = { start: world, end: world };
        setDraftRect({ start: world, end: world });
        return;
      }

      const visible = visibleObjects();
      const handlePx = isCoarsePointer ? TOUCH_HANDLE_PX : 10;

      if (currentTool === "select" && selectedKey) {
        const sel = objectsRef.current?.find((o) => o.key === selectedKey);
        const meta = (sel?.obj.metadata as { kind?: string } | undefined) ?? {};
        if (sel && meta.kind !== "chip") {
          const lid = sel.obj.layerId ?? null;
          const layer = lid ? layersRef.current?.find((l) => l.id === lid) : null;
          if (!layer?.locked) {
            const picked = pickHandle({
              obj: sel.obj,
              pointerScreen: pt,
              stagePos: stagePosRef.current!,
              scale: scaleRef.current!,
              handlePx,
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
      }

      const hit = hitObject(world.x, world.y, visible, layersRef.current ?? []);
      if (hit) {
        selectHit(hit, e.shiftKey, e.ctrlKey);
        const lid = hit.obj.layerId ?? null;
        const layer = lid ? layersRef.current?.find((l) => l.id === lid) : null;
        if (layer?.locked) return;
        const keys =
          selectedKeys.length > 1 && selectedKeys.includes(hit.key)
            ? selectedKeys
            : hit.obj.groupId
              ? (objectsRef.current ?? [])
                  .filter((o) => o.obj.groupId === hit.obj.groupId)
                  .map((o) => o.key)
              : [hit.key];
        beginObjectDrag(hit, world, keys);
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
    [
      editingKey,
      canvasRef,
      currentTool,
      selectedKey,
      selectedKeys,
      isCoarsePointer,
      visibleObjects,
      objectsRef,
      layersRef,
      stagePosRef,
      scaleRef,
      controllerRef,
      shapeDraft,
      selectionDraftRef,
      setIsGrabbing,
      setDraftRect,
      setSelectedKey,
      setSelectedKeys,
      selectHit,
      beginObjectDrag,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (editingKey) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const pt = getCanvasPoint(canvas, e.clientX, e.clientY);
      if (!pt) return;

      // Two-finger navigation (touch)
      if (activePointersRef.current.has(e.pointerId)) {
        activePointersRef.current.set(e.pointerId, pt);
      }
      const transformActive = controllerRef.current?.isTransformActive() ?? false;
      if (
        isCoarsePointer &&
        e.pointerType === "touch" &&
        activePointersRef.current.size >= 2 &&
        shouldAllowPinch(touchPhaseRef.current, transformActive)
      ) {
        const pts = [...activePointersRef.current.values()];
        if (pts.length >= 2) {
          const mid = midpoint(pts[0], pts[1]);
          const dist = pointerDistance(pts[0], pts[1]);
          if (
            shouldInitPinchBaseline(
              touchPhaseRef.current,
              pinchStartDistanceRef.current,
            )
          ) {
            resetTouchGesture();
            touchPhaseRef.current = "twoFinger";
            pinchStartDistanceRef.current = dist;
            pinchStartScaleRef.current = scaleRef.current!;
            pinchStartStagePosRef.current = { ...stagePosRef.current! };
            pinchStartMidpointRef.current = mid;
            controllerRef.current?.startTwoFingerPan({
              midpoint: mid,
              stagePos: stagePosRef.current!,
            });
          } else {
            const scaleFactor = computePinchScaleFactor(
              dist,
              pinchStartDistanceRef.current,
            );
            if (scaleFactor == null || !pinchStartMidpointRef.current) return;
            const zoomed = controllerRef.current?.pinchZoom({
              midpoint: mid,
              scaleFactor,
              stagePos: pinchStartStagePosRef.current,
              scale: pinchStartScaleRef.current,
            });
            if (zoomed) {
              setStagePos(
                composePinchStagePos(
                  zoomed.stagePos,
                  pinchStartMidpointRef.current,
                  mid,
                ),
              );
              setScale(zoomed.scale);
            }
          }
        }
        return;
      }

      // Touch single-finger
      if (
        isCoarsePointer &&
        e.pointerType === "touch" &&
        touchPointerIdRef.current === e.pointerId
      ) {
        const world = screenToWorld(pt.x, pt.y, stagePosRef.current!, scaleRef.current!);

        if (touchPhaseRef.current === "transform" || transformActive) {
          const next = controllerRef.current?.moveTransform({
            world,
            objects: objectsRef.current ?? [],
          });
          if (next) {
            objectsRef.current = next;
            setObjects(next);
          }
          return;
        }

        const startCanvas = touchStartCanvasRef.current;
        const startClient = touchStartClientRef.current;
        if (!startCanvas || !startClient) return;

        if (
          !touchMovedRef.current &&
          movementExceeded(startCanvas, pt)
        ) {
          touchMovedRef.current = true;
          clearLongPressTimer();
          setLongPressRing(null);
        }

        const phase = touchPhaseRef.current;

        if (phase === "pending" && touchMovedRef.current && !touchLongPressFiredRef.current) {
          const hit = touchHitRef.current;
          if (hit) {
            const lid = hit.obj.layerId ?? null;
            const layer = lid ? layersRef.current?.find((l) => l.id === lid) : null;
            if (!layer?.locked) {
              let keys = currentSelectionKeys(selectedKeys, selectedKey);
              if (!keys.includes(hit.key)) {
                selectHit(hit, false, false);
                keys = hit.obj.groupId
                  ? (objectsRef.current ?? [])
                      .filter((o) => o.obj.groupId === hit.obj.groupId)
                      .map((o) => o.key)
                  : [hit.key];
              } else if (keys.length > 1) {
                keys = keys;
              } else {
                keys = hit.obj.groupId
                  ? (objectsRef.current ?? [])
                      .filter((o) => o.obj.groupId === hit.obj.groupId)
                      .map((o) => o.key)
                  : [hit.key];
              }
              touchPhaseRef.current = "dragObject";
              beginObjectDrag(hit, world, keys);
            }
          } else {
            touchPhaseRef.current = "pan";
            controllerRef.current?.startPan({
              pointer: pt,
              stagePos: stagePosRef.current!,
            });
          }
        }

        if (phase === "longPressPending" && touchMovedRef.current && touchLongPressFiredRef.current) {
          if (!touchHadSelectionRef.current) {
            if (currentTool === "select") {
              touchPhaseRef.current = "marquee";
              selectionDraftRef.current = { start: world, end: world };
              setDraftRect({ start: world, end: world });
            } else if (currentTool === "shape" || currentTool === "text") {
              touchPhaseRef.current = "shapeDraft";
              shapeDraft.current = { start: world, end: world };
              setDraftRect({ start: world, end: world });
            }
          }
        }

        if (shapeDraft.current && touchPhaseRef.current === "shapeDraft") {
          shapeDraft.current = { ...shapeDraft.current, end: world };
          setDraftRect({ ...shapeDraft.current });
          return;
        }
        if (selectionDraftRef.current && touchPhaseRef.current === "marquee") {
          selectionDraftRef.current = { ...selectionDraftRef.current, end: world };
          setDraftRect({ ...selectionDraftRef.current });
          return;
        }

        const next = controllerRef.current?.moveTransform({
          world,
          objects: objectsRef.current ?? [],
        });
        if (next) {
          objectsRef.current = next;
          setObjects(next);
          return;
        }
        if (dragObjectKey.current) {
          const move = controllerRef.current?.moveDrag({ world });
          if (move) {
            setObjects((prev) => {
              const nextObjects = controllerRef.current!.applyDragToObjects(prev, move);
              objectsRef.current = nextObjects;
              return nextObjects;
            });
          }
          return;
        }
        const nextPan = controllerRef.current?.movePan({ pointer: pt });
        if (nextPan) setStagePos(nextPan);
        return;
      }

      // Desktop move
      if (!isGrabbing) return;
      const world = screenToWorld(pt.x, pt.y, stagePosRef.current!, scaleRef.current!);

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
      const next = controllerRef.current?.moveTransform({
        world,
        objects: objectsRef.current ?? [],
      });
        if (next) {
          objectsRef.current = next;
          setObjects(next);
          return;
        }
        if (dragObjectKey.current) {
          const move = controllerRef.current?.moveDrag({ world });
          if (move) {
            setObjects((prev) => {
              const nextObjects = controllerRef.current!.applyDragToObjects(prev, move);
              objectsRef.current = nextObjects;
              return nextObjects;
            });
          }
          return;
        }
      const nextPan = controllerRef.current?.movePan({ pointer: pt });
      if (nextPan) setStagePos(nextPan);
    },
    [
      editingKey,
      canvasRef,
      isCoarsePointer,
      isGrabbing,
      selectedKeys,
      selectedKey,
      currentTool,
      clearLongPressTimer,
      resetTouchGesture,
      controllerRef,
      stagePosRef,
      scaleRef,
      objectsRef,
      shapeDraft,
      selectionDraftRef,
      dragObjectKey,
      setDraftRect,
      setObjects,
      setStagePos,
      setScale,
      beginObjectDrag,
    ]
  );

  const handleTouchPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (editingKey || e.button !== 0) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const pt = getCanvasPoint(canvas, e.clientX, e.clientY);
      if (!pt) return;

      activePointersRef.current.set(e.pointerId, pt);
      canvas.setPointerCapture(e.pointerId);

      const transformActive = controllerRef.current?.isTransformActive() ?? false;
      if (
        activePointersRef.current.size >= 2 &&
        !shouldAllowPinch(touchPhaseRef.current, transformActive)
      ) {
        return;
      }

      if (activePointersRef.current.size >= 2) {
        resetTouchGesture();
        pinchStartDistanceRef.current = 0;
        return;
      }

      const world = screenToWorld(pt.x, pt.y, stagePosRef.current!, scaleRef.current!);
      const visible = visibleObjects();
      const hit = hitObject(world.x, world.y, visible, layersRef.current ?? []);

      if (currentTool === "select" && selectedKey) {
        const sel = objectsRef.current?.find((o) => o.key === selectedKey);
        const meta = (sel?.obj.metadata as { kind?: string } | undefined) ?? {};
        if (sel && meta.kind !== "chip") {
          const lid = sel.obj.layerId ?? null;
          const layer = lid ? layersRef.current?.find((l) => l.id === lid) : null;
          if (!layer?.locked) {
            const picked = pickHandle({
              obj: sel.obj,
              pointerScreen: pt,
              stagePos: stagePosRef.current!,
              scale: scaleRef.current!,
              handlePx: TOUCH_HANDLE_PX,
            });
            if (picked) {
              clearLongPressTimer();
              touchPhaseRef.current = "transform";
              touchPointerIdRef.current = e.pointerId;
              touchStartCanvasRef.current = pt;
              touchStartClientRef.current = { x: e.clientX, y: e.clientY };
              touchStartTimeRef.current = Date.now();
              touchMovedRef.current = true;
              setIsGrabbing(true);
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
      }

      touchPhaseRef.current = "pending";
      touchPointerIdRef.current = e.pointerId;
      touchStartCanvasRef.current = pt;
      touchStartClientRef.current = { x: e.clientX, y: e.clientY };
      touchStartTimeRef.current = Date.now();
      touchMovedRef.current = false;
      touchLongPressFiredRef.current = false;
      touchHitRef.current = hit;
      touchHadSelectionRef.current =
        currentSelectionKeys(selectedKeys, selectedKey).length > 0;
      setIsGrabbing(true);

      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        if (touchMovedRef.current) return;
        touchLongPressFiredRef.current = true;
        touchPhaseRef.current = "longPressPending";
        setLongPressRing({ clientX: e.clientX, clientY: e.clientY });
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(10);
        }
      }, LONG_PRESS_MS);
    },
    [
      editingKey,
      canvasRef,
      selectedKeys,
      selectedKey,
      stagePosRef,
      scaleRef,
      visibleObjects,
      objectsRef,
      layersRef,
      currentTool,
      selectedKey,
      controllerRef,
      setIsGrabbing,
      clearLongPressTimer,
      resetTouchGesture,
    ]
  );

  const handleTouchPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      activePointersRef.current.delete(e.pointerId);
      if (canvas?.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }

      if (touchPhaseRef.current === "twoFinger") {
        if (activePointersRef.current.size < 2) {
          controllerRef.current?.endTwoFingerPan();
          touchPhaseRef.current = "idle";
          pinchStartDistanceRef.current = 0;
          pinchStartMidpointRef.current = null;
        }
        if (activePointersRef.current.size === 0) {
          setIsGrabbing(false);
        }
        return;
      }

      if (touchPointerIdRef.current !== e.pointerId) return;

      clearLongPressTimer();
      setLongPressRing(null);

      const elapsed = Date.now() - touchStartTimeRef.current;
      const hit = touchHitRef.current;
      const hadSelection = touchHadSelectionRef.current;
      const longFired = touchLongPressFiredRef.current;
      const moved = touchMovedRef.current;
      const phase = touchPhaseRef.current;

      if (isShortTap(elapsed, moved) && phase === "pending") {
        if (hit) {
          const now = Date.now();
          if (
            hit.obj.type === "text" &&
            lastTapRef.current.key === hit.key &&
            now - lastTapRef.current.time < DOUBLE_TAP_MS
          ) {
            tryEditText(hit);
            lastTapRef.current = { time: 0, key: null };
          } else {
            selectHit(hit, false, false);
            lastTapRef.current = { time: now, key: hit.key };
          }
        } else {
          setSelectedKey(null);
          setSelectedKeys([]);
          lastTapRef.current = { time: 0, key: null };
        }
        resetTouchGesture();
        finishInteraction();
        return;
      }

      if (longFired && !moved) {
        const resolution = resolveLongPressMenu({
          hit,
          selectedKeys,
          selectedKey,
        });
        if (resolution.action === "selectOnly") {
          setSelectedKey(resolution.selectKey);
          setSelectedKeys(resolution.selectKeys);
        } else if (resolution.action === "openMenu") {
          if (resolution.selectKey) setSelectedKey(resolution.selectKey);
          if (resolution.selectKeys) setSelectedKeys(resolution.selectKeys);
          contextMenuKeysRef.current = resolution.menuKeys;
          onContextMenuKeysChange(resolution.menuKeys);
          const client = touchStartClientRef.current ?? { x: e.clientX, y: e.clientY };
          onMobileMenuOpen(
            { open: true, x: client.x, y: client.y },
            resolution.menuKeys
          );
        }
        resetTouchGesture();
        finishInteraction();
        return;
      }

      if (
        longFired &&
        moved &&
        !hadSelection &&
        (phase === "marquee" || phase === "shapeDraft" || phase === "longPressPending")
      ) {
        finishInteraction();
        resetTouchGesture();
        return;
      }

      finishInteraction();
      resetTouchGesture();
    },
    [
      canvasRef,
      selectedKeys,
      selectedKey,
      clearLongPressTimer,
      resetTouchGesture,
      finishInteraction,
      selectHit,
      tryEditText,
      setSelectedKey,
      setSelectedKeys,
      contextMenuKeysRef,
      onMobileMenuOpen,
      onContextMenuKeysChange,
      controllerRef,
      setIsGrabbing,
    ]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isCoarsePointer && e.pointerType === "touch") {
        handleTouchPointerDown(e);
        return;
      }
      handleDesktopPointerDown(e);
    },
    [isCoarsePointer, handleTouchPointerDown, handleDesktopPointerDown]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isCoarsePointer && e.pointerType === "touch") {
        handleTouchPointerUp(e);
        return;
      }
      finishInteraction();
    },
    [isCoarsePointer, handleTouchPointerUp, finishInteraction]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      activePointersRef.current.delete(e.pointerId);
      resetTouchGesture();
      finishInteraction();
    },
    [resetTouchGesture, finishInteraction]
  );

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
    [editingKey, canvasRef, stagePos, scale, stageSize, controllerRef, setStagePos, setScale]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (editingKey || isCoarsePointer) return;
      const pt = getCanvasPoint(canvasRef.current, e.clientX, e.clientY);
      if (!pt) return;
      const world = screenToWorld(pt.x, pt.y, stagePosRef.current!, scaleRef.current!);
      const hit = hitObject(world.x, world.y, visibleObjects(), layersRef.current ?? []);
      if (hit) tryEditText(hit);
    },
    [editingKey, isCoarsePointer, canvasRef, stagePosRef, scaleRef, visibleObjects, tryEditText]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (editingKey) {
        e.preventDefault();
        return;
      }
      if (isCoarsePointer) {
        e.preventDefault();
        return;
      }
      if (isGrabbing && e.button !== 2) {
        e.preventDefault();
        return;
      }
      const pt = getCanvasPoint(canvasRef.current, e.clientX, e.clientY);
      if (!pt) return;
      const world = screenToWorld(pt.x, pt.y, stagePosRef.current!, scaleRef.current!);
      const hit = hitObject(world.x, world.y, visibleObjects(), layersRef.current ?? []);
      const resolved = resolveDesktopContextMenu({ hit, selectedKeys, selectedKey });
      if (resolved.selectKey) setSelectedKey(resolved.selectKey);
      if (resolved.selectKeys) setSelectedKeys(resolved.selectKeys);
      contextMenuKeysRef.current = resolved.menuKeys;
      onContextMenuKeysChange(resolved.menuKeys);
    },
    [
      editingKey,
      isCoarsePointer,
      isGrabbing,
      canvasRef,
      stagePosRef,
      scaleRef,
      visibleObjects,
      layersRef,
      selectedKeys,
      selectedKey,
      setSelectedKey,
      setSelectedKeys,
      contextMenuKeysRef,
      onContextMenuKeysChange,
    ]
  );

  return {
    longPressRing,
    canvasHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onPointerLeave: handlePointerUp,
      onWheel: handleWheel,
      onDoubleClick: handleDoubleClick,
      onContextMenu: handleContextMenu,
    },
  };
}
