import * as ContextMenu from "@radix-ui/react-context-menu";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSessionFull } from "../api/sessions";
import { getSocket } from "../realtime/socket";
import type { TabletopBaseObject } from "@dnd-table/shared";
import { CanvasRenderer } from "../tabletop/render/CanvasRenderer";
import { HistoryManager, type HistoryOp } from "../tabletop/history/HistoryManager";
import { SpatialIndex } from "../tabletop/spatial";
import { getVisibleWorldRect, hitObject, objectInRect, screenToWorld, worldToScreen, getObjectAabb } from "../tabletop/geometry";
import { CHIP_RADIUS, GRID_SIZE } from "../tabletop/constants";
import { TableSync, type AppliedOp, type SyncStatus, type TablePatchOp } from "../tabletop/realtime/TableSync";
import { TableController } from "../tabletop/controller/TableController";
import { pickHandle } from "../tabletop/controller/handles";
import {
  layerFromDto,
  nextObjectKey,
  objectFromDto,
  randomColor,
  toTabletopChip,
  toTabletopImage,
  toTabletopRect,
  toTabletopText,
  type Layer,
  type TableObjectState,
  type Tool,
} from "../tabletop/model";

// geometry/spatial helpers moved to `frontend/src/tabletop/*`

function objectsInView(
  objects: TableObjectState[],
  stagePos: { x: number; y: number },
  scale: number,
  width: number,
  height: number
): TableObjectState[] {
  // deprecated helper kept for now (most callsites moved to SpatialIndex.query)
  const rect = getVisibleWorldRect(stagePos, scale, width, height);
  return objects.filter((o) => {
    const aabb = getObjectAabb(o);
    return !(aabb.right < rect.left || aabb.left > rect.right || aabb.bottom < rect.top || aabb.top > rect.bottom);
  });
}

// hit-test moved to `frontend/src/tabletop/geometry.ts`

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
  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);
  useEffect(() => {
    stagePosRef.current = stagePos;
  }, [stagePos]);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");

  const [currentTool, setCurrentTool] = useState<Tool>("select");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const editingRef = useRef<HTMLTextAreaElement | null>(null);
  const contextKeyRef = useRef<string | null>(null);
  const clipboardRef = useRef<string | null>(null);
  const CLIP_PREFIX = "dnd-table/tabletop-object:";
  const selectionDraftRef = useRef<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);

  const primarySelectionKey = selectedKey ?? selectedKeys[0] ?? null;

  const copySelectionToClipboard = useCallback(async () => {
    if (!id) return;
    const keys = selectedKeys.length ? selectedKeys : primarySelectionKey ? [primarySelectionKey] : [];
    if (keys.length === 0) return;
    const objectsToCopy = keys
      .map((k) => objectsRef.current.find((o) => o.key === k)?.obj)
      .filter(Boolean) as TabletopBaseObject[];
    if (objectsToCopy.length === 0) return;
    const payload = CLIP_PREFIX + JSON.stringify({ v: 1, objects: objectsToCopy });
    clipboardRef.current = payload;
    await navigator.clipboard?.writeText(payload).catch(() => {});
  }, [id, selectedKeys, primarySelectionKey]);

  const pasteSelectionFromTextRef = useRef<(text: string) => boolean>(() => false);
  const pasteSelectionRef = useRef<() => Promise<void>>(async () => {});
  const [imageTick, setImageTick] = useState(0);
  const [draftRect, setDraftRect] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);

  const [isGrabbing, setIsGrabbing] = useState(false);
  const dragObjectKey = useRef<string | null>(null);
  const dragStartObjPos = useRef<{ x: number; y: number } | null>(null);
  const shapeDraft = useRef<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const lastWorldRef = useRef<{ x: number; y: number } | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const controllerRef = useRef<TableController | null>(null);
  useEffect(() => {
    if (!rendererRef.current) {
      rendererRef.current = new CanvasRenderer(imageCacheRef.current, () => setImageTick((t) => t + 1));
    }
    if (!controllerRef.current) {
      controllerRef.current = new TableController();
    }
  }, []);

  // clientId for optimistic updates & ignoring own broadcasts
  const clientId = useMemo(() => {
    const key = "dnd.clientId";
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const created = `c-${Math.random().toString(16).slice(2)}-${Date.now()}`;
    sessionStorage.setItem(key, created);
    return created;
  }, []);

  const syncRef = useRef<TableSync | null>(null);

  const enqueueOps = useCallback((ops: TablePatchOp[]) => {
    syncRef.current?.enqueue(ops);
  }, []);

  const flushNow = useCallback(() => {
    syncRef.current?.flushNow();
  }, []);

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

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadStatus("loading");
    getSessionFull(id)
      .then((res) => {
        if (cancelled) return;
        const { state, objects } = res.data;
        if (state?.viewport) {
          setStagePos({ x: state.viewport.panX, y: state.viewport.panY });
          setScale(state.viewport.scale);
        }
        const nextLayers = objects
          .map((o) => layerFromDto(o))
          .filter((x): x is Layer => Boolean(x))
          .sort((a, b) => a.order - b.order);
        setLayers(nextLayers);
        if (nextLayers.length > 0) setActiveLayerId((prev) => prev ?? nextLayers[0].id);

        const next = objects
          .map((o) => objectFromDto(o))
          .filter((x): x is TableObjectState => Boolean(x));
        setObjects(next);
        setLoadStatus("loaded");
      })
      .catch(() => {
        if (!cancelled) setLoadStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    syncRef.current = new TableSync({
      tableId: id,
      clientId,
      socket,
      setStatus: setSyncStatus,
      onConflict: async () => {
        const res = await getSessionFull(id);
        const { state, objects } = res.data;
        if (state?.viewport) {
          setStagePos({ x: state.viewport.panX, y: state.viewport.panY });
          setScale(state.viewport.scale);
        }
        const nextLayers = objects
          .map((o) => layerFromDto(o))
          .filter((x): x is Layer => Boolean(x))
          .sort((a, b) => a.order - b.order);
        setLayers(nextLayers);
        if (nextLayers.length > 0) setActiveLayerId((prev) => prev ?? nextLayers[0].id);
        const next = objects
          .map((o) => objectFromDto(o))
          .filter((x): x is TableObjectState => Boolean(x));
        setObjects(next);
      },
      onBroadcast: (applied: AppliedOp[]) => {
        setLayers((prev) => {
          let next = prev.slice();
          for (const op of applied) {
            if (op.action === "create" && op.object.type === "layer") {
              const l = layerFromDto({ id: op.key, key: op.key, version: op.version, type: "layer", props: op.object.props });
              if (!l) continue;
              if (!next.some((x) => x.id === l.id)) next.push(l);
            }
            if (op.action === "update") {
              const l = layerFromDto({ id: op.key, key: op.key, version: op.version, type: "layer", props: op.patch.props });
              if (!l) continue;
              next = next.map((x) => (x.id === l.id ? l : x));
            }
            if (op.action === "delete") {
              next = next.filter((x) => `layer:${x.id}` !== op.key && `layer-${x.id}` !== op.key && x.id !== op.key);
            }
          }
          return next.sort((a, b) => a.order - b.order);
        });

        setObjects((prev) => {
          let next = prev.slice();
          for (const op of applied) {
            if (op.action === "create") {
              const created = objectFromDto({
                id: op.key,
                key: op.key,
                version: op.version,
                type: op.object.type,
                x: op.object.x,
                y: op.object.y,
                sortOrder: op.object.sortOrder,
                props: op.object.props,
              });
              if (!created) continue;
              const exists = next.some((o) => o.key === op.key);
              if (!exists) next.push(created);
              else next = next.map((o) => (o.key === op.key ? { ...o, version: op.version } : o));
            } else if (op.action === "update") {
              next = next.map((o) => {
                if (o.key !== op.key) return o;
                const nextX = op.patch.x ?? o.obj.transform.position.x;
                const nextY = op.patch.y ?? o.obj.transform.position.y;
                const nextProps = op.patch.props ?? (o.obj as unknown as Record<string, unknown>);
                const patched = objectFromDto({
                  id: op.key,
                  key: op.key,
                  version: op.version,
                  type: o.obj.type,
                  x: nextX,
                  y: nextY,
                  sortOrder: op.patch.sortOrder ?? o.sortOrder,
                  props: nextProps,
                });
                return patched ?? { ...o, version: op.version };
              });
            } else if (op.action === "delete") {
              next = next.filter((o) => o.key !== op.key);
            }
          }
          return next;
        });
      },
    });
    const stop = syncRef.current.start();
    return () => {
      stop();
      syncRef.current = null;
    };
  }, [id, clientId]);

  const spatial = useMemo(() => new SpatialIndex(objects, 400), [objects]);

  const legacyRedraw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const left = (0 - stagePos.x) / scale;
      const right = (width - stagePos.x) / scale;
      const top = (0 - stagePos.y) / scale;
      const bottom = (height - stagePos.y) / scale;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      ctx.save();
      ctx.translate(stagePos.x, stagePos.y);
      ctx.scale(scale, scale);

      // Сетка только в видимой области
      ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
      ctx.lineWidth = 1 / scale;
      const startX = Math.floor(left / GRID_SIZE) * GRID_SIZE;
      const endX = Math.ceil(right / GRID_SIZE) * GRID_SIZE;
      const startY = Math.floor(top / GRID_SIZE) * GRID_SIZE;
      const endY = Math.ceil(bottom / GRID_SIZE) * GRID_SIZE;
      ctx.beginPath();
      for (let x = startX; x <= endX; x += GRID_SIZE) {
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
      }
      for (let y = startY; y <= endY; y += GRID_SIZE) {
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
      }
      ctx.stroke();

      const visible = spatial.query(getVisibleWorldRect(stagePos, scale, width, height))
        .filter((o) => {
          const lid = o.obj.layerId ?? null;
          if (!lid) return true;
          const layer = layers.find((l) => l.id === lid);
          return layer ? layer.visible : true;
        })
        .slice()
        .sort((a, b) => {
          const az = a.obj.transform.position.z ?? 0;
          const bz = b.obj.transform.position.z ?? 0;
          if (az !== bz) return az - bz;
          return a.sortOrder - b.sortOrder;
        });
      visible.forEach((o) => {
        if (o.obj.type === "image") {
          const meta: any = o.obj.metadata ?? {};
          const x = o.obj.transform.position.x;
          const y = o.obj.transform.position.y;
          const w = typeof meta.width === "number" ? meta.width : 240;
          const h = typeof meta.height === "number" ? meta.height : 160;
          const deg = o.obj.transform.rotation ?? 0;
          const rad = (deg * Math.PI) / 180;
          const sprite = typeof o.obj.appearance?.sprite === "string" ? o.obj.appearance.sprite : "";
          if (!sprite) return;

          let img = imageCacheRef.current.get(sprite);
          if (!img) {
            img = new Image();
            img.src = sprite;
            img.onload = () => setImageTick((t) => t + 1);
            imageCacheRef.current.set(sprite, img);
          }
          if (!img.complete) return;

          ctx.save();
          ctx.translate(x + w / 2, y + h / 2);
          if (deg) ctx.rotate(rad);
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
          ctx.strokeStyle = "rgba(0,0,0,0.25)";
          ctx.lineWidth = 2 / scale;
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          ctx.restore();
          return;
        }

        if (o.obj.type === "text") {
          const meta: any = o.obj.metadata ?? {};
          const x = o.obj.transform.position.x;
          const y = o.obj.transform.position.y;
          const w = typeof meta.width === "number" ? meta.width : 200;
          const h = typeof meta.height === "number" ? meta.height : 80;
          const text = o.obj.text?.text ?? "";
          const fontSize = o.obj.text?.fontSize ?? 16;
          const font = o.obj.text?.font ?? "Inter";
          const color = o.obj.text?.textColor ?? "#111827";

          ctx.save();
          ctx.fillStyle = "rgba(255,255,255,0.0)";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "rgba(0,0,0,0.15)";
          ctx.lineWidth = 1 / scale;
          ctx.strokeRect(x, y, w, h);

          ctx.fillStyle = color;
          ctx.font = `${fontSize}px ${font}`;
          ctx.textBaseline = "top";

          // very simple wrap
          const padding = 6;
          const maxWidth = Math.max(0, w - padding * 2);
          const words = text.split(/\s+/);
          let line = "";
          let yy = y + padding;
          for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            const m = ctx.measureText(test);
            if (m.width > maxWidth && line) {
              ctx.fillText(line, x + padding, yy);
              line = word;
              yy += fontSize + 2;
              if (yy > y + h - fontSize) break;
            } else {
              line = test;
            }
          }
          if (line && yy <= y + h - fontSize) {
            ctx.fillText(line, x + padding, yy);
          }

          ctx.restore();
          return;
        }

        if (o.obj.type !== "shape") return;
        const meta: any = o.obj.metadata ?? {};
        const x = o.obj.transform.position.x;
        const y = o.obj.transform.position.y;
        const fill = typeof o.obj.appearance?.fillColor === "string" ? o.obj.appearance.fillColor : "#3b82f6";
        const stroke = typeof o.obj.appearance?.strokeColor === "string" ? o.obj.appearance.strokeColor : "rgba(0,0,0,0.25)";

        if (meta.kind === "chip") {
          const r = typeof meta.radius === "number" ? meta.radius : CHIP_RADIUS;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = fill;
          ctx.fill();
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 2 / scale;
          ctx.stroke();
          return;
        }

        const w = typeof meta.width === "number" ? meta.width : 120;
        const h = typeof meta.height === "number" ? meta.height : 80;
        const shape = o.obj.appearance?.shape ?? "rectangle";
        const deg = o.obj.transform.rotation ?? 0;
        const rad = (deg * Math.PI) / 180;
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        if (deg) ctx.rotate(rad);
        if (shape === "ellipse") {
          ctx.beginPath();
          ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fillStyle = fill;
          ctx.fill();
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 2 / scale;
          ctx.stroke();
        } else {
          ctx.fillStyle = fill;
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 2 / scale;
          ctx.strokeRect(-w / 2, -h / 2, w, h);
        }
        ctx.restore();
      });

      if (selectedKey || selectedKeys.length > 0) {
        const keys = selectedKeys.length > 0 ? selectedKeys : (selectedKey ? [selectedKey] : []);
        const selectedObjects = keys.map((k) => objects.find((o) => o.key === k)).filter(Boolean) as TableObjectState[];
        const primary = selectedKey ? objects.find((o) => o.key === selectedKey) ?? null : (selectedObjects[0] ?? null);
        if (selectedObjects.length > 0) {
          const aabbs = selectedObjects.map(getObjectAabb);
          const aabb = {
            left: Math.min(...aabbs.map((a) => a.left)),
            right: Math.max(...aabbs.map((a) => a.right)),
            top: Math.min(...aabbs.map((a) => a.top)),
            bottom: Math.max(...aabbs.map((a) => a.bottom)),
          };
          ctx.save();
          ctx.strokeStyle = "rgba(79,70,229,0.9)";
          ctx.lineWidth = 2 / scale;
          ctx.setLineDash([4 / scale, 3 / scale]);
          ctx.strokeRect(aabb.left, aabb.top, aabb.right - aabb.left, aabb.bottom - aabb.top);
          ctx.restore();

          const meta: any = primary?.obj.metadata ?? {};
          if (primary && meta.kind !== "chip" && selectedObjects.length === 1) {
            const x = primary.obj.transform.position.x;
            const y = primary.obj.transform.position.y;
            const w = typeof meta.width === "number" ? meta.width : 120;
            const h = typeof meta.height === "number" ? meta.height : 80;
            const deg = primary.obj.transform.rotation ?? 0;
            const rad = (deg * Math.PI) / 180;
            const cx = x + w / 2;
            const cy = y + h / 2;
            const rot = (px: number, py: number) => ({
              x: cx + px * Math.cos(rad) - py * Math.sin(rad),
              y: cy + px * Math.sin(rad) + py * Math.cos(rad),
            });
            const hs = 6 / scale; // handle half-size in world units (constant px)

            const pts = {
              nw: rot(-w / 2, -h / 2),
              n: rot(0, -h / 2),
              ne: rot(w / 2, -h / 2),
              e: rot(w / 2, 0),
              se: rot(w / 2, h / 2),
              s: rot(0, h / 2),
              sw: rot(-w / 2, h / 2),
              w: rot(-w / 2, 0),
            };
            const rotHandle = rot(0, -h / 2 - 28 / scale);

            ctx.save();
            ctx.setLineDash([]);
            ctx.strokeStyle = "rgba(79,70,229,0.9)";
            ctx.fillStyle = "white";
            ctx.lineWidth = 2 / scale;

            // rotation line + handle
            ctx.beginPath();
            ctx.moveTo(pts.n.x, pts.n.y);
            ctx.lineTo(rotHandle.x, rotHandle.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(rotHandle.x, rotHandle.y, 6 / scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // resize handles
            for (const p of Object.values(pts)) {
              ctx.beginPath();
              ctx.rect(p.x - hs, p.y - hs, hs * 2, hs * 2);
              ctx.fill();
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      }

      if (draftRect) {
        const x1 = draftRect.start.x;
        const y1 = draftRect.start.y;
        const x2 = draftRect.end.x;
        const y2 = draftRect.end.y;
        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const w = Math.abs(x2 - x1);
        const h = Math.abs(y2 - y1);
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.setLineDash([6 / scale, 4 / scale]);
        ctx.strokeStyle = "rgba(79,70,229,0.9)";
        ctx.lineWidth = 2 / scale;
        ctx.strokeRect(left, top, w, h);
        ctx.restore();
      }

      ctx.restore();
    },
    [stagePos, scale, spatial, objects, draftRect, selectedKey, selectedKeys, imageTick, layers]
  );

  const redraw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // keep legacy referenced to avoid unused warnings during migration
      if (false) legacyRedraw(ctx, width, height);

      const renderer = rendererRef.current;
      if (!renderer) return;
      const visibleRect = getVisibleWorldRect(stagePos, scale, width, height);
      renderer.draw({
        ctx,
        stagePos,
        scale,
        stageSize: { width, height },
        visibleRect,
        objects: spatial.query(visibleRect),
        layers,
        selectedKeys: selectedKeys.length ? selectedKeys : selectedKey ? [selectedKey] : [],
        primarySelectedKey: selectedKey,
        draftRect,
      });
    },
    [legacyRedraw, stagePos, scale, spatial, draftRect, selectedKey, selectedKeys, imageTick, layers]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || stageSize.width <= 0 || stageSize.height <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = stageSize.width;
    canvas.height = stageSize.height;
    redraw(ctx, stageSize.width, stageSize.height);
  }, [stageSize, stagePos, scale, objects, redraw]);

  const historyRef = useRef(new HistoryManager());
  const dragSnapshotRef = useRef<Map<string, { obj: TabletopBaseObject; sortOrder: number }>>(new Map());

  const cloneObj = useCallback((o: TabletopBaseObject): TabletopBaseObject => {
    return JSON.parse(JSON.stringify(o)) as TabletopBaseObject;
  }, []);

  const pushHistory = useCallback((entry: { undo: HistoryOp[]; redo: HistoryOp[] }) => {
    historyRef.current.push(entry);
  }, []);

  const createAndEnqueue = useCallback((key: string, obj: TabletopBaseObject) => {
    const withLayer =
      activeLayerId && !obj.layerId
        ? { ...obj, layerId: activeLayerId }
        : obj;
    const sortOrder = objectsRef.current.length;
    const state: TableObjectState = { key, version: 1, sortOrder, obj: withLayer };
    setObjects((prev) => [...prev, state]);
    setSelectedKey(key);
    setSelectedKeys([key]);
    enqueueOps([{
      opId: `op-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action: "create",
      key,
      object: {
        type: withLayer.type,
        x: withLayer.transform.position.x,
        y: withLayer.transform.position.y,
        sortOrder,
        props: withLayer as unknown as Record<string, unknown>,
      },
    }]);
    pushHistory({
      undo: [{ kind: "delete", key }],
      redo: [{ kind: "create", key, obj: cloneObj(withLayer), sortOrder }],
    });
  }, [enqueueOps, activeLayerId, pushHistory, cloneObj]);

  // Copy/Paste helpers (depend on createAndEnqueue)
  useEffect(() => {
    pasteSelectionFromTextRef.current = (text: string) => {
      if (!id) return false;
      if (!text.startsWith(CLIP_PREFIX)) return false;
      const raw = text.slice(CLIP_PREFIX.length);
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return false;
      }
      const objs = (parsed?.objects ?? (parsed?.obj ? [parsed.obj] : null)) as TabletopBaseObject[] | null;
      if (!objs || !Array.isArray(objs) || objs.length === 0) return false;

      const dx = 20 / Math.max(0.0001, scaleRef.current);
      const dy = 20 / Math.max(0.0001, scaleRef.current);
      const createdKeys: string[] = [];

      for (const src of objs) {
        if (!src || typeof src !== "object" || !(src as any).transform || !(src as any).type) continue;
        const key = nextObjectKey((src as any).type);
        const pos = (src.transform?.position ?? { x: 0, y: 0 }) as any;
        const nextObj: TabletopBaseObject = {
          ...(JSON.parse(JSON.stringify(src)) as TabletopBaseObject),
          id: key,
          groupId: null,
          transform: {
            ...src.transform,
            position: { ...pos, x: (pos.x ?? 0) + dx, y: (pos.y ?? 0) + dy },
          },
        };
        createAndEnqueue(key, nextObj);
        createdKeys.push(key);
      }

      if (createdKeys.length > 0) {
        setSelectedKey(createdKeys[0]);
        setSelectedKeys(createdKeys);
      }
      return createdKeys.length > 0;
    };

    pasteSelectionRef.current = async () => {
      const sys = await navigator.clipboard?.readText().catch(() => "");
      const mem = clipboardRef.current ?? "";
      const text = sys && sys.startsWith(CLIP_PREFIX) ? sys : mem;
      if (!text) return;
      pasteSelectionFromTextRef.current(text);
    };
  }, [id, createAndEnqueue]);

  const layerKey = useCallback((layerId: string) => `layer:${layerId}`, []);

  const createLayerAndEnqueue = useCallback((layer: Layer) => {
    setLayers((prev) => [...prev, layer].sort((a, b) => a.order - b.order));
    if (!activeLayerId) setActiveLayerId(layer.id);
    enqueueOps([{
      opId: `op-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action: "create",
      key: layer.key,
      object: {
        type: "layer",
        x: 0,
        y: 0,
        sortOrder: layer.order,
        props: { layer } as any,
      },
    }]);
  }, [enqueueOps, layerKey, activeLayerId]);

  const updateLayerAndEnqueue = useCallback((layer: Layer) => {
    setLayers((prev) => prev.map((l) => (l.id === layer.id ? layer : l)).sort((a, b) => a.order - b.order));
    const baseVersion = layer.version;
    // optimistic
    setLayers((prev) =>
      prev.map((l) => (l.id === layer.id ? { ...layer, version: layer.version + 1 } : l))
    );
    enqueueOps([{
      opId: `op-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action: "update",
      key: layer.key,
      baseVersion,
      patch: { props: { layer } as any },
    }]);
  }, [enqueueOps, layerKey]);

  const applyHistoryOps = useCallback((ops: HistoryOp[]) => {
    for (const op of ops) {
      if (op.kind === "delete") {
        const current = objectsRef.current.find((o) => o.key === op.key);
        if (!current) continue;
        const baseVersion = current.version;
        setObjects((prev) => prev.filter((o) => o.key !== op.key));
        enqueueOps([{
          opId: `op-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          action: "delete",
          key: op.key,
          baseVersion,
        }]);
        continue;
      }

      if (op.kind === "create") {
        const exists = objectsRef.current.some((o) => o.key === op.key);
        if (exists) continue;
        const state: TableObjectState = { key: op.key, version: 1, sortOrder: op.sortOrder, obj: op.obj };
        setObjects((prev) => [...prev, state]);
        enqueueOps([{
          opId: `op-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          action: "create",
          key: op.key,
          object: {
            type: op.obj.type,
            x: op.obj.transform.position.x,
            y: op.obj.transform.position.y,
            sortOrder: op.sortOrder,
            props: op.obj as unknown as Record<string, unknown>,
          },
        }]);
        continue;
      }

      if (op.kind === "restore") {
        const current = objectsRef.current.find((o) => o.key === op.key);
        if (!current) continue;
        const baseVersion = current.version;
        setObjects((prev) =>
          prev.map((o) => (o.key === op.key ? { ...o, obj: op.obj, sortOrder: op.sortOrder } : o))
        );
        enqueueOps([{
          opId: `op-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          action: "update",
          key: op.key,
          baseVersion,
          patch: {
            x: op.obj.transform.position.x,
            y: op.obj.transform.position.y,
            sortOrder: op.sortOrder,
            props: op.obj as unknown as Record<string, unknown>,
          },
        }]);
      }
    }
  }, [enqueueOps]);

  const undo = useCallback(() => {
    historyRef.current.undo(applyHistoryOps);
  }, [applyHistoryOps]);

  const redo = useCallback(() => {
    historyRef.current.redo(applyHistoryOps);
  }, [applyHistoryOps]);

  // While editing text, prevent body scroll + focus without scrolling.
  useEffect(() => {
    if (!editingKey) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [editingKey]);

  // (context menu handled by Radix)

  useLayoutEffect(() => {
    if (!editingKey) return;
    try {
      editingRef.current?.focus({ preventScroll: true });
    } catch {
      editingRef.current?.focus();
    }
  }, [editingKey]);

  // Ensure at least one layer exists (synced through patch ops)
  useEffect(() => {
    if (!id) return;
    if (loadStatus !== "loaded") return;
    if (layersRef.current.length > 0) return;
    const baseId = "base";
    const layer: Layer = {
      id: baseId,
      key: layerKey(baseId),
      version: 1,
      name: "Base",
      order: 0,
      visible: true,
      locked: false,
    };
    createLayerAndEnqueue(layer);
    setActiveLayerId(baseId);
  }, [id, loadStatus, createLayerAndEnqueue, layerKey]);

  const addChip = useCallback(() => {
    const sp = stagePosRef.current;
    const sc = scaleRef.current;
    const centerX = (stageSize.width / 2 - sp.x) / sc;
    const centerY = (stageSize.height / 2 - sp.y) / sc;
    const key = nextObjectKey("chip");
    const color = randomColor();
    const obj = toTabletopChip({ key, x: centerX, y: centerY, color });
    createAndEnqueue(key, obj);
  }, [stageSize.width, stageSize.height, createAndEnqueue]);

  // Future-proof: flush on focus loss of text inputs
  useEffect(() => {
    const onFocusOut = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const isTextField =
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        (t as HTMLElement).isContentEditable;
      if (isTextField) {
        syncRef.current?.flushNow();
      }
    };
    document.addEventListener("focusout", onFocusOut, true);
    return () => document.removeEventListener("focusout", onFocusOut, true);
  }, []);

  // Paste / Drop: MVP image & text insertion
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!id) return;
      // Our object clipboard format (Figma-like)
      const plain = e.clipboardData?.getData("text/plain") ?? "";
      if (plain.startsWith(CLIP_PREFIX)) {
        const ok = pasteSelectionFromTextRef.current(plain);
        if (ok) e.preventDefault();
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = () => {
            const sprite = typeof reader.result === "string" ? reader.result : "";
            if (!sprite) return;
            const sp = stagePosRef.current;
            const sc = scaleRef.current;
            const centerX = (stageSize.width / 2 - sp.x) / sc;
            const centerY = (stageSize.height / 2 - sp.y) / sc;
            const key = nextObjectKey("image");
            const obj = toTabletopImage({ key, x: centerX, y: centerY, width: 240, height: 160, sprite });
            createAndEnqueue(key, obj);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          return;
        }
      }

      // Text fallback
      const text = e.clipboardData?.getData("text/plain");
      if (text && text.trim()) {
        const sp = stagePosRef.current;
        const sc = scaleRef.current;
        const centerX = (stageSize.width / 2 - sp.x) / sc;
        const centerY = (stageSize.height / 2 - sp.y) / sc;
        const key = nextObjectKey("text");
        const obj = toTabletopText({ key, x: centerX, y: centerY, width: 260, height: 90, text });
        createAndEnqueue(key, obj);
        e.preventDefault();
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [id, stageSize.width, stageSize.height, createAndEnqueue]);

  // Copy: write full object JSON into clipboardData (works even when Clipboard API is blocked)
  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      if (!id) return;
      if (editingKey) return;
      const t = e.target as HTMLElement | null;
      const isTextField =
        t?.tagName === "INPUT" ||
        t?.tagName === "TEXTAREA" ||
        Boolean((t as any)?.isContentEditable);
      if (isTextField) return;

      const keys = selectedKeys.length ? selectedKeys : selectedKey ? [selectedKey] : [];
      if (keys.length === 0) return;
      const objectsToCopy = keys
        .map((k) => objectsRef.current.find((o) => o.key === k)?.obj)
        .filter(Boolean) as TabletopBaseObject[];
      if (objectsToCopy.length === 0) return;
      const payload = CLIP_PREFIX + JSON.stringify({ v: 1, objects: objectsToCopy });
      clipboardRef.current = payload;
      try {
        e.clipboardData?.setData("text/plain", payload);
        e.preventDefault();
      } catch {
        // ignore
      }
    };
    window.addEventListener("copy", onCopy);
    return () => window.removeEventListener("copy", onCopy);
  }, [id, editingKey, selectedKey, selectedKeys]);

  const getCanvasPoint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

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

      const controller = controllerRef.current;
      if (!controller) return;
      const next = controller.wheelZoom({
        input: { deltaY: e.deltaY, pointer: { x: pointerX, y: pointerY } },
        stagePos,
        scale,
      });
      setStagePos(next.stagePos);
      setScale(next.scale);
    },
    [editingKey, stagePos, scale, stageSize.width, stageSize.height]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (editingKey) return;
      // Middle button pans the camera.
      if (e.button === 1) {
        e.preventDefault();
        const pt = getCanvasPoint(e);
        if (!pt) return;
        setIsGrabbing(true);
        controllerRef.current?.startPan({ pointer: pt, stagePos: stagePosRef.current });
        return;
      }

      // Only left button starts object interactions. Right button is reserved for context menu.
      if (e.button !== 0) return;
      const pt = getCanvasPoint(e);
      if (!pt) return;
      setIsGrabbing(true);
      const world = screenToWorld(pt.x, pt.y, stagePosRef.current, scaleRef.current);

      // Pan tool no longer uses left button (panning is on middle mouse button).

      if (currentTool === "shape") {
        shapeDraft.current = { start: world, end: world };
        setDraftRect({ start: world, end: world });
        return;
      }

      if (currentTool === "text") {
        shapeDraft.current = { start: world, end: world };
        setDraftRect({ start: world, end: world });
        return;
      }

      if (currentTool === "select" && selectedKey) {
        const sel = objects.find((o) => o.key === selectedKey);
        const meta: any = sel?.obj.metadata ?? {};
        if (sel && meta.kind !== "chip") {
          const lid = sel.obj.layerId ?? null;
          const layer = lid ? layersRef.current.find((l) => l.id === lid) : null;
          if (layer?.locked) {
            // allow selecting, but no transform handles on locked layer
            return;
          }
          const picked = pickHandle({ obj: sel.obj, pointerScreen: pt, stagePos: stagePosRef.current, scale: scaleRef.current });
          if (picked) {
            dragSnapshotRef.current = new Map([[selectedKey, { obj: cloneObj(sel.obj), sortOrder: sel.sortOrder }]]);
            if (picked.kind === "rotate") controllerRef.current?.startRotate({ key: selectedKey, obj: sel.obj as any, world });
            else controllerRef.current?.startResize({ key: selectedKey, obj: sel.obj as any, handle: picked.handle, world });
            dragObjectKey.current = selectedKey;
            return;
          }
        }
      }

      const visible = spatial.query(getVisibleWorldRect(stagePosRef.current, scaleRef.current, stageSize.width, stageSize.height))
        .filter((o) => {
          const lid = o.obj.layerId ?? null;
          if (!lid) return true;
          const layer = layersRef.current.find((l) => l.id === lid);
          return layer ? layer.visible : true;
        });
      const hit = hitObject(world.x, world.y, visible);
      if (hit) {
        const lid = hit.obj.layerId ?? null;
        const layer = lid ? layersRef.current.find((l) => l.id === lid) : null;
        // ctrl-click toggles multi-selection (like Figma)
        if (!hit.obj.groupId && e.ctrlKey) {
          setSelectedKey(hit.key);
          setSelectedKeys((prev) => (prev.includes(hit.key) ? prev.filter((k) => k !== hit.key) : [...prev, hit.key]));
        } else {
          const controller = controllerRef.current;
          const objectsForSel = objectsRef.current.map((o) => ({ key: o.key, groupId: o.obj.groupId ?? null }));
          const sel = controller?.computeSelection({
            hit: { key: hit.key, groupId: hit.obj.groupId ?? null },
            shiftKey: e.shiftKey,
            objects: objectsForSel,
          }) ?? { selectedKey: hit.key, selectedKeys: [hit.key] };
          setSelectedKey(sel.selectedKey);
          if (!hit.obj.groupId && e.shiftKey) {
            setSelectedKeys((prev) => (prev.includes(hit.key) ? prev.filter((k) => k !== hit.key) : [...prev, hit.key]));
          } else {
            setSelectedKeys(sel.selectedKeys);
          }
        }
        // locked layer: allow select, but don't allow transforms
        if (layer?.locked) return;
        dragObjectKey.current = hit.key;
        dragStartObjPos.current = { x: hit.obj.transform.position.x, y: hit.obj.transform.position.y };
        const keys =
          selectedKeys.length > 1 && selectedKeys.includes(hit.key)
            ? selectedKeys
            : hit.obj.groupId
              ? objectsRef.current.filter((o) => o.obj.groupId === hit.obj.groupId).map((o) => o.key)
              : [hit.key];
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

      setSelectedKey(null);
      setSelectedKeys([]);
      // start selection box (marquee) in select tool
      if (currentTool === "select") {
        selectionDraftRef.current = { start: world, end: world };
        setDraftRect({ start: world, end: world });
      }
    },
    [editingKey, objects, spatial, stageSize.width, stageSize.height, getCanvasPoint, currentTool]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (editingKey) return;
      // Ignore move unless we're in an active interaction (started by left button).
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
    [editingKey, getCanvasPoint, currentTool, selectedKeys, isGrabbing]
  );

  const handleMouseUp = useCallback(() => {
    if (!id) return;

    // select tool: finalize marquee selection
    if (selectionDraftRef.current && currentTool === "select") {
      const { start, end } = selectionDraftRef.current;
      const left = Math.min(start.x, end.x);
      const top = Math.min(start.y, end.y);
      const right = Math.max(start.x, end.x);
      const bottom = Math.max(start.y, end.y);
      selectionDraftRef.current = null;
      setDraftRect(null);

      const r = { left, top, right, bottom };
      const visible = spatial.query(getVisibleWorldRect(stagePosRef.current, scaleRef.current, stageSize.width, stageSize.height))
        .filter((o) => {
          const lid = o.obj.layerId ?? null;
          if (!lid) return true;
          const layer = layersRef.current.find((l) => l.id === lid);
          return layer ? layer.visible : true;
        });
      const picked = visible.filter((o) => objectInRect(o, r));
      const keys = picked.map((o) => o.key);
      setSelectedKeys(keys);
      setSelectedKey(keys[0] ?? null);
    }

    // shape tool: finalize draft into a rectangle object
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
        const obj = toTabletopRect({ key, x: left, y: top, width: w, height: h, fillColor: "#60a5fa" });
        createAndEnqueue(key, obj);
      }
    }

    // text tool: finalize draft into a text object and enter editing mode
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
        createAndEnqueue(key, obj);
        setEditingKey(key);
        setEditingText("");
      }
    }

    // if we were dragging objects, emit update patches (optimistic version bump)
    const draggedKey = dragObjectKey.current;
    if (draggedKey) {
      const movedKeys = controllerRef.current?.endDrag() ?? [draggedKey];
      const touched = movedKeys
        .map((k) => objectsRef.current.find((o) => o.key === k))
        .filter(Boolean) as TableObjectState[];
      if (touched.length > 0) {
        const now = Date.now();
        // optimistic local version increment
        setObjects((prev) =>
          prev.map((o) => (movedKeys.includes(o.key) ? { ...o, version: o.version + 1 } : o))
        );
        enqueueOps(touched.map((o, idx) => ({
          opId: `op-${now}-${idx}-${Math.random().toString(16).slice(2)}`,
          action: "update",
          key: o.key,
          baseVersion: o.version,
          patch: {
            x: o.obj.transform.position.x,
            y: o.obj.transform.position.y,
            props: o.obj as unknown as Record<string, unknown>,
          },
        })));

        const before = dragSnapshotRef.current;
        if (before && before.size > 0) {
          const undoOps: HistoryOp[] = [];
          const redoOps: HistoryOp[] = [];
          for (const [k, snap] of before.entries()) {
            const after = objectsRef.current.find((o) => o.key === k);
            if (!after) continue;
            undoOps.push({ kind: "restore", key: k, obj: snap.obj, sortOrder: snap.sortOrder });
            redoOps.push({ kind: "restore", key: k, obj: cloneObj(after.obj), sortOrder: after.sortOrder });
          }
          if (undoOps.length > 0) pushHistory({ undo: undoOps, redo: redoOps });
        }
      }
    }

    setIsGrabbing(false);
    controllerRef.current?.endPan();
    dragObjectKey.current = null;
    dragStartObjPos.current = null;
    controllerRef.current?.endTransform();
    dragSnapshotRef.current = new Map();
    lastWorldRef.current = null;
  }, [id, currentTool, enqueueOps, createAndEnqueue, pushHistory, cloneObj]);

  // pagehide/visibilitychange: best-effort final flush
  useEffect(() => {
    if (!id) return;
    const onPageHide = () => syncRef.current?.flushNow();
    const onVis = () => {
      if (document.visibilityState === "hidden") syncRef.current?.flushNow();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [id]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editingKey) return;
    const pt = getCanvasPoint(e);
    if (!pt) return;
    const world = screenToWorld(pt.x, pt.y, stagePosRef.current, scaleRef.current);
    const visible = objectsInView(objectsRef.current, stagePosRef.current, scaleRef.current, stageSize.width, stageSize.height)
      .filter((o) => {
        const lid = o.obj.layerId ?? null;
        if (!lid) return true;
        const layer = layersRef.current.find((l) => l.id === lid);
        return layer ? layer.visible : true;
      });
    const hit = hitObject(world.x, world.y, visible);
    if (hit && hit.obj.type === "text") {
      setSelectedKey(hit.key);
      const text = hit.obj.text?.text ?? "";
      setEditingKey(hit.key);
      setEditingText(text);
    }
  }, [editingKey, getCanvasPoint, stageSize.width, stageSize.height]);

  const handleMouseLeave = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  const selected = selectedKey ? objects.find((o) => o.key === selectedKey) : null;
  const selectedLayer =
    selected && selected.obj.layerId
      ? layers.find((l) => l.id === selected.obj.layerId) ?? null
      : null;

  const updateObjectLocal = useCallback((key: string, updater: (o: TableObjectState) => TableObjectState) => {
    setObjects((prev) => prev.map((o) => (o.key === key ? updater(o) : o)));
  }, []);

  const commitObject = useCallback((key: string) => {
    const current = objectsRef.current.find((o) => o.key === key);
    if (!current) return;
    const baseVersion = current.version;
    const x = current.obj.transform.position.x;
    const y = current.obj.transform.position.y;

    // optimistic local version increment
    setObjects((prev) => prev.map((o) => (o.key === key ? { ...o, version: o.version + 1 } : o)));

    enqueueOps([{
      opId: `op-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action: "update",
      key,
      baseVersion,
      patch: {
        x,
        y,
        sortOrder: current.sortOrder,
        props: current.obj as unknown as Record<string, unknown>,
      },
    }]);
  }, [enqueueOps]);

  const commitObjectWith = useCallback((key: string, nextObj: TabletopBaseObject) => {
    const current = objectsRef.current.find((o) => o.key === key);
    if (!current) return;
    const baseVersion = current.version;
    const x = nextObj.transform.position.x;
    const y = nextObj.transform.position.y;

    // optimistic local version increment + apply object payload immediately
    setObjects((prev) =>
      prev.map((o) => (o.key === key ? { ...o, version: o.version + 1, obj: nextObj } : o))
    );

    enqueueOps([{
      opId: `op-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action: "update",
      key,
      baseVersion,
      patch: {
        x,
        y,
        sortOrder: current.sortOrder,
        props: nextObj as unknown as Record<string, unknown>,
      },
    }]);
  }, [enqueueOps]);

  const deleteSelected = useCallback(() => {
    const key = selectedKey ?? selectedKeys[0] ?? null;
    if (!key) return;
    const current = objectsRef.current.find((o) => o.key === key);
    if (!current) return;
    const baseVersion = current.version;

    setObjects((prev) => prev.filter((o) => o.key !== key));
    setSelectedKey(null);
    setSelectedKeys([]);
    contextKeyRef.current = null;

    enqueueOps([{
      opId: `op-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action: "delete",
      key,
      baseVersion,
    }]);

    pushHistory({
      undo: [{ kind: "create", key, obj: cloneObj(current.obj), sortOrder: current.sortOrder }],
      redo: [{ kind: "delete", key }],
    });
  }, [selectedKey, selectedKeys, enqueueOps, pushHistory, cloneObj]);

  // keyboard shortcuts (undo/redo + delete)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't hijack when typing in inputs/textarea/contentEditable
      const t = e.target as HTMLElement | null;
      const isTextField =
        t?.tagName === "INPUT" ||
        t?.tagName === "TEXTAREA" ||
        Boolean((t as any)?.isContentEditable);

      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (editingKey) return;
        if (isTextField) return;
        e.preventDefault();
        deleteSelected();
        return;
      }

      if (!mod) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (editingKey) return;
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) {
        if (editingKey) return;
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, editingKey, deleteSelected]);

  return (
    <div
      className="fixed inset-0 flex flex-col bg-gray-200 overflow-hidden"
      style={{ height: "100vh", width: "100vw" }}
    >
      <header className="shrink-0 flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Link
            to="/sessions"
            className="text-sm text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
          >
            ← К списку сессий
          </Link>
          <span className="text-gray-600 text-sm">Сессия {id || ""}</span>
          {loadStatus === "loading" && (
            <span className="text-gray-500 text-sm">Загрузка…</span>
          )}
          {loadStatus === "error" && (
            <span className="text-red-600 text-sm">Ошибка загрузки</span>
          )}
          {syncStatus === "syncing" && <span className="text-gray-500 text-sm">Синхронизация…</span>}
          {syncStatus === "conflict" && <span className="text-amber-600 text-sm">Конфликт версий, обновляю…</span>}
          {syncStatus === "error" && <span className="text-red-600 text-sm">Ошибка синхронизации</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={flushNow}
            disabled={loadStatus !== "loaded"}
            className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            Синхронизировать
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 w-full overflow-hidden flex">
        <aside className="shrink-0 w-44 bg-white border-r border-gray-200 p-3 space-y-2">
          <div className="text-xs font-medium text-gray-500">Инструменты</div>
          {(["select", "shape", "text", "image", "pan"] as Tool[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setCurrentTool(t)}
              className={[
                "w-full text-left px-3 py-2 rounded text-sm border",
                currentTool === t
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50",
              ].join(" ")}
            >
              {t === "select" ? "Select" : t === "shape" ? "Shape" : t === "text" ? "Text" : t === "image" ? "Image" : "Pan"}
            </button>
          ))}

          <div className="pt-2 border-t border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-gray-500">Слои</div>
              <button
                type="button"
                className="text-xs text-indigo-600 hover:underline"
                onClick={() => {
                  const id = `l-${Date.now()}`;
                  createLayerAndEnqueue({
                    id,
                    key: layerKey(id),
                    version: 1,
                    name: `Layer ${layers.length + 1}`,
                    order: layers.length,
                    visible: true,
                    locked: false,
                  });
                }}
              >
                + Add
              </button>
            </div>
            <div className="space-y-1">
              {layers.slice().sort((a, b) => a.order - b.order).map((l) => (
                <div key={l.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveLayerId(l.id)}
                    className={[
                      "flex-1 px-2 py-1 rounded text-xs border text-left truncate",
                      activeLayerId === l.id
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50",
                    ].join(" ")}
                    title={l.name}
                  >
                    {l.name}
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                    title={l.visible ? "Скрыть слой" : "Показать слой"}
                    onClick={() => updateLayerAndEnqueue({ ...l, visible: !l.visible })}
                  >
                    {l.visible ? "Vis" : "Hid"}
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                    title={l.locked ? "Разблокировать" : "Заблокировать"}
                    onClick={() => updateLayerAndEnqueue({ ...l, locked: !l.locked })}
                  >
                    {l.locked ? "Lock" : "Free"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200 space-y-2">
            <button
              type="button"
              onClick={addChip}
              className="w-full px-3 py-2 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-500"
            >
              + Фишка (MVP)
            </button>
          </div>
        </aside>

        <div
          ref={containerRef}
          className="flex-1 min-h-0 w-full overflow-hidden relative"
          style={{
            cursor:
              currentTool === "shape"
                  ? "crosshair"
                  : isGrabbing
                    ? "grabbing"
                    : "default",
          }}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (!id) return;
            const files = Array.from(e.dataTransfer.files || []);
            const img = files.find((f) => f.type.startsWith("image/"));
            if (!img) return;
            const reader = new FileReader();
            reader.onload = () => {
              const sprite = typeof reader.result === "string" ? reader.result : "";
              if (!sprite) return;
              const sp = stagePosRef.current;
              const sc = scaleRef.current;
              const centerX = (stageSize.width / 2 - sp.x) / sc;
              const centerY = (stageSize.height / 2 - sp.y) / sc;
              const key = nextObjectKey("image");
              const obj = toTabletopImage({ key, x: centerX, y: centerY, width: 240, height: 160, sprite });
              createAndEnqueue(key, obj);
            };
            reader.readAsDataURL(img);
          }}
        >
          <ContextMenu.Root
            onOpenChange={(open) => {
              if (!open) contextKeyRef.current = null;
            }}
          >
            <ContextMenu.Trigger asChild>
              <canvas
                ref={canvasRef}
                width={stageSize.width}
                height={stageSize.height}
                className="block w-full h-full"
                style={{ display: "block" }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onDoubleClick={handleDoubleClick}
                onContextMenu={(e) => {
                  // Let Radix open the menu; we only update selection here.
                  if (editingKey) {
                    e.preventDefault();
                    return;
                  }
                  if (isGrabbing) {
                    e.preventDefault();
                    return;
                  }
                  const pt = getCanvasPoint(e as any);
                  if (!pt) return;
                  const world = screenToWorld(pt.x, pt.y, stagePosRef.current, scaleRef.current);
                  const visible = objectsInView(
                    objectsRef.current,
                    stagePosRef.current,
                    scaleRef.current,
                    stageSize.width,
                    stageSize.height
                  ).filter((o) => {
                    const lid = o.obj.layerId ?? null;
                    if (!lid) return true;
                    const layer = layersRef.current.find((l) => l.id === lid);
                    return layer ? layer.visible : true;
                  });
                  const hit = hitObject(world.x, world.y, visible);
                  const key = hit?.key ?? (selectedKey ?? selectedKeys[0] ?? null);
                  if (!key) {
                    // If nothing is selected, don't show the menu.
                    e.preventDefault();
                    contextKeyRef.current = null;
                    return;
                  }
                  setSelectedKey(key);
                  setSelectedKeys([key]);
                  contextKeyRef.current = key;
                }}
              />
            </ContextMenu.Trigger>

            <ContextMenu.Portal>
              <ContextMenu.Content
                className="z-[70] min-w-[180px] rounded-md border border-gray-200 bg-white shadow-lg p-1"
                alignOffset={4}
              >
                  <ContextMenu.Item
                    className="select-none rounded px-3 py-2 text-sm outline-none hover:bg-gray-50 focus:bg-gray-50"
                    onSelect={(e) => {
                      e.preventDefault();
                      void copySelectionToClipboard();
                    }}
                  >
                    Копировать
                  </ContextMenu.Item>

                  <ContextMenu.Item
                    className="select-none rounded px-3 py-2 text-sm outline-none hover:bg-gray-50 focus:bg-gray-50"
                    onSelect={(e) => {
                      e.preventDefault();
                      void pasteSelectionRef.current();
                    }}
                  >
                    Вставить
                  </ContextMenu.Item>

                  <ContextMenu.Separator className="my-1 h-px bg-gray-200" />
                <ContextMenu.Item
                  className="select-none rounded px-3 py-2 text-sm outline-none hover:bg-gray-50 focus:bg-gray-50"
                  onSelect={(e) => {
                    e.preventDefault();
                    const key = contextKeyRef.current;
                    if (key) {
                      setSelectedKey(key);
                      setSelectedKeys([key]);
                    }
                    deleteSelected();
                  }}
                >
                  Удалить
                </ContextMenu.Item>
              </ContextMenu.Content>
            </ContextMenu.Portal>
          </ContextMenu.Root>

          {editingKey && (() => {
            const o = objects.find((x) => x.key === editingKey);
            if (!o || o.obj.type !== "text") return null;
            const meta: any = o.obj.metadata ?? {};
            const w = typeof meta.width === "number" ? meta.width : 200;
            const h = typeof meta.height === "number" ? meta.height : 80;
            const p = o.obj.transform.position;
            const s = worldToScreen(p.x, p.y, stagePosRef.current, scaleRef.current);
            const canvas = canvasRef.current;
            const rect = canvas?.getBoundingClientRect();
            const cw = canvas?.width ?? stageSize.width;
            const ch = canvas?.height ?? stageSize.height;

            const pad = 8;
            const cssX = rect ? rect.left + (s.x / Math.max(1, cw)) * rect.width : s.x;
            const cssY = rect ? rect.top + (s.y / Math.max(1, ch)) * rect.height : s.y;
            const cssW = rect ? ((w * scaleRef.current) / Math.max(1, cw)) * rect.width : w * scaleRef.current;
            const cssH = rect ? ((h * scaleRef.current) / Math.max(1, ch)) * rect.height : h * scaleRef.current;

            const boundLeft = rect ? rect.left + pad : pad;
            const boundTop = rect ? rect.top + pad : pad;
            const boundRight = rect ? rect.right - pad : window.innerWidth - pad;
            const boundBottom = rect ? rect.bottom - pad : window.innerHeight - pad;

            const width = Math.min(boundRight - boundLeft, Math.max(80, cssW));
            const height = Math.min(boundBottom - boundTop, Math.max(40, cssH));
            const left = Math.min(boundRight - width, Math.max(boundLeft, cssX));
            const top = Math.min(boundBottom - height, Math.max(boundTop, cssY));

            return createPortal(
              <textarea
                ref={editingRef}
                value={editingText}
                onMouseDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Escape") {
                    setEditingKey(null);
                    setEditingText("");
                  }
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    (e.currentTarget as HTMLTextAreaElement).blur();
                  }
                }}
                onBlur={() => {
                  const key = editingKey;
                  if (!key) return;
                  const text = editingText;
                  const current = objectsRef.current.find((x) => x.key === key);
                  if (!current) return;
                  const nextObj: TabletopBaseObject = {
                    ...(current.obj as TabletopBaseObject),
                    text: { ...(current.obj.text ?? {}), text } as any,
                  };
                  commitObjectWith(key, nextObj);
                  setEditingKey(null);
                }}
                className="fixed z-50 p-2 text-sm bg-white/95 border border-indigo-300 rounded shadow"
                style={{
                  left,
                  top,
                  width,
                  height,
                  resize: "none",
                }}
              />,
              document.body
            );
          })()}
        </div>

        {/* context menu handled by Radix */}

        <aside className="shrink-0 w-72 bg-white border-l border-gray-200 p-3 overflow-auto">
          <div className="text-xs font-medium text-gray-500 mb-2">Свойства</div>
          {!selected && <div className="text-sm text-gray-500">Выберите объект.</div>}
          {selected && (
            <div className="space-y-3">
              <div className="text-xs text-gray-500">
                key: <span className="font-mono">{selected.key}</span> · v{selected.version}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={selectedKeys.length < 2}
                  className="px-3 py-1.5 rounded border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50"
                  onClick={() => {
                    if (selectedKeys.length < 2) return;
                    const gid = `g-${Date.now()}`;
                    selectedKeys.forEach((k) => {
                      updateObjectLocal(k, (o) => ({ ...o, obj: { ...o.obj, groupId: gid } }));
                      commitObject(k);
                    });
                  }}
                >
                  Group
                </button>
                <button
                  type="button"
                  disabled={!selected.obj.groupId}
                  className="px-3 py-1.5 rounded border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50"
                  onClick={() => {
                    const gid = selected.obj.groupId;
                    if (!gid) return;
                    objectsRef.current
                      .filter((o) => o.obj.groupId === gid)
                      .forEach((o) => {
                        updateObjectLocal(o.key, (x) => ({ ...x, obj: { ...x.obj, groupId: null } }));
                        commitObject(o.key);
                      });
                    setSelectedKeys([selected.key]);
                  }}
                >
                  Ungroup
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-gray-600">
                  X
                  <input
                    className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    type="number"
                    value={Number.isFinite(selected.obj.transform.position.x) ? selected.obj.transform.position.x : 0}
                    disabled={Boolean(selectedLayer?.locked)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateObjectLocal(selected.key, (o) => ({
                        ...o,
                        obj: { ...o.obj, transform: { ...o.obj.transform, position: { ...o.obj.transform.position, x: v } } },
                      }));
                    }}
                    onBlur={() => commitObject(selected.key)}
                  />
                </label>
                <label className="text-xs text-gray-600">
                  Y
                  <input
                    className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    type="number"
                    value={Number.isFinite(selected.obj.transform.position.y) ? selected.obj.transform.position.y : 0}
                    disabled={Boolean(selectedLayer?.locked)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateObjectLocal(selected.key, (o) => ({
                        ...o,
                        obj: { ...o.obj, transform: { ...o.obj.transform, position: { ...o.obj.transform.position, y: v } } },
                      }));
                    }}
                    onBlur={() => commitObject(selected.key)}
                  />
                </label>
              </div>

              <label className="text-xs text-gray-600 block">
                Rotation (deg)
                <input
                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  type="number"
                  value={Number.isFinite(selected.obj.transform.rotation ?? 0) ? (selected.obj.transform.rotation ?? 0) : 0}
                  disabled={Boolean(selectedLayer?.locked)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    updateObjectLocal(selected.key, (o) => ({
                      ...o,
                      obj: { ...o.obj, transform: { ...o.obj.transform, rotation: v } },
                    }));
                  }}
                  onBlur={() => commitObject(selected.key)}
                />
              </label>

              {((selected.obj.metadata as any)?.kind !== "chip") && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-gray-600">
                    Width
                    <input
                      className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      type="number"
                      min={1}
                      value={Number((selected.obj.metadata as any)?.width ?? 120)}
                      disabled={Boolean(selectedLayer?.locked)}
                      onChange={(e) => {
                        const v = Math.max(1, Number(e.target.value));
                        updateObjectLocal(selected.key, (o) => ({
                          ...o,
                          obj: { ...o.obj, metadata: { ...(o.obj.metadata as any), width: v } },
                        }));
                      }}
                      onBlur={() => commitObject(selected.key)}
                    />
                  </label>
                  <label className="text-xs text-gray-600">
                    Height
                    <input
                      className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      type="number"
                      min={1}
                      value={Number((selected.obj.metadata as any)?.height ?? 80)}
                      disabled={Boolean(selectedLayer?.locked)}
                      onChange={(e) => {
                        const v = Math.max(1, Number(e.target.value));
                        updateObjectLocal(selected.key, (o) => ({
                          ...o,
                          obj: { ...o.obj, metadata: { ...(o.obj.metadata as any), height: v } },
                        }));
                      }}
                      onBlur={() => commitObject(selected.key)}
                    />
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-gray-600">
                  Fill
                  <input
                    className="mt-1 w-full h-9 border border-gray-300 rounded"
                    type="color"
                    value={typeof selected.obj.appearance?.fillColor === "string" ? selected.obj.appearance.fillColor : "#3b82f6"}
                    disabled={Boolean(selectedLayer?.locked)}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateObjectLocal(selected.key, (o) => ({
                        ...o,
                        obj: { ...o.obj, appearance: { ...(o.obj.appearance ?? {}), fillColor: v } },
                      }));
                    }}
                    onBlur={() => commitObject(selected.key)}
                  />
                </label>
                <label className="text-xs text-gray-600">
                  Stroke
                  <input
                    className="mt-1 w-full h-9 border border-gray-300 rounded"
                    type="color"
                    value={typeof selected.obj.appearance?.strokeColor === "string" && selected.obj.appearance.strokeColor.startsWith("#")
                      ? selected.obj.appearance.strokeColor
                      : "#000000"}
                    disabled={Boolean(selectedLayer?.locked)}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateObjectLocal(selected.key, (o) => ({
                        ...o,
                        obj: { ...o.obj, appearance: { ...(o.obj.appearance ?? {}), strokeColor: v } },
                      }));
                    }}
                    onBlur={() => commitObject(selected.key)}
                  />
                </label>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
