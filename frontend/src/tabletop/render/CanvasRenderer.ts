import type { TableObjectState, Layer } from "../model";
import type { WorldRect } from "../geometry";
import { GRID_SIZE } from "../constants";
import { getObjectAabb } from "../geometry";
import { ShapePainter } from "../appearance/ShapePainter";
import type { ShapeVariantId } from "../shapes";
import { ShapeVariantRegistry } from "../shapes";

/** Contour-only glow — shadow on stroke, no fill over the object. */
function drawSelectionGlow(
  ctx: CanvasRenderingContext2D,
  aabb: WorldRect,
  scale: number,
) {
  const x = aabb.left;
  const y = aabb.top;
  const w = aabb.right - aabb.left;
  const h = aabb.bottom - aabb.top;

  ctx.save();
  ctx.fillStyle = "transparent";
  ctx.strokeStyle = "rgba(107, 143, 156, 0.01)";
  ctx.lineWidth = 1 / scale;
  ctx.shadowColor = "rgba(107, 143, 156, 0.5)";
  ctx.shadowBlur = 20 / scale;
  ctx.strokeRect(x, y, w, h);

  ctx.shadowColor = "rgba(184, 106, 78, 0.3)";
  ctx.shadowBlur = 12 / scale;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

export class CanvasRenderer {
  private imageCache: Map<string, HTMLImageElement>;
  private onImageLoad: () => void;
  private shapePainter: ShapePainter;

  constructor(imageCache: Map<string, HTMLImageElement>, onImageLoad: () => void) {
    this.imageCache = imageCache;
    this.onImageLoad = onImageLoad;
    this.shapePainter = new ShapePainter((sprite) => this.getOrLoadImage(sprite));
  }

  private getOrLoadImage(sprite: string) {
    let img = this.imageCache.get(sprite);
    if (!img) {
      img = new Image();
      img.src = sprite;
      img.onload = this.onImageLoad;
      this.imageCache.set(sprite, img);
    }
    return img;
  }

  draw(params: {
    ctx: CanvasRenderingContext2D;
    stagePos: { x: number; y: number };
    scale: number;
    stageSize: { width: number; height: number };
    visibleRect: WorldRect;
    objects: TableObjectState[];
    layers: Layer[];
    selectedKeys: string[];
    primarySelectedKey: string | null;
    draftRect: { start: { x: number; y: number }; end: { x: number; y: number } } | null;
    draftShapeVariant?: ShapeVariantId | null;
    /** Drawn last so dragged objects appear above overlapping rotated shapes. */
    bringToFrontKeys?: string[];
  }) {
    const {
      ctx,
      stagePos,
      scale,
      stageSize,
      visibleRect,
      objects,
      layers,
      selectedKeys,
      primarySelectedKey,
      draftRect,
      draftShapeVariant = null,
      bringToFrontKeys = [],
    } = params;
    const frontSet = new Set(bringToFrontKeys);
    const width = stageSize.width;
    const height = stageSize.height;

    const left = visibleRect.left;
    const right = visibleRect.right;
    const top = visibleRect.top;
    const bottom = visibleRect.bottom;

    // clear
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgba(223, 219, 212, 0.88)";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // world transform
    ctx.save();
    ctx.translate(stagePos.x, stagePos.y);
    ctx.scale(scale, scale);

    // grid
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

    // visible + sorted (objects being dragged render on top)
    const filtered = objects
      .filter((o) => {
        const lid = o.obj.layerId ?? null;
        if (!lid) return true;
        const layer = layers.find((l) => l.id === lid);
        return layer ? layer.visible : true;
      })
      .slice()
      .sort((a, b) => {
        const af = frontSet.has(a.key) ? 1 : 0;
        const bf = frontSet.has(b.key) ? 1 : 0;
        if (af !== bf) return af - bf;
        const az = a.obj.transform.position.z ?? 0;
        const bz = b.obj.transform.position.z ?? 0;
        if (az !== bz) return az - bz;
        return a.sortOrder - b.sortOrder;
      });

    for (const o of filtered) {
      const meta: any = o.obj.metadata ?? {};
      const x = o.obj.transform.position.x;
      const y = o.obj.transform.position.y;

      if (o.obj.type === "image") {
        const w = typeof meta.width === "number" ? meta.width : 240;
        const h = typeof meta.height === "number" ? meta.height : 160;
        const deg = o.obj.transform.rotation ?? 0;
        const rad = (deg * Math.PI) / 180;
        const sprite = typeof o.obj.appearance?.sprite === "string" ? o.obj.appearance.sprite : "";
        if (!sprite) continue;
        const img = this.getOrLoadImage(sprite);
        if (!img.complete) continue;
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        if (deg) ctx.rotate(rad);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 2 / scale;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.restore();
        continue;
      }

      if (o.obj.type === "text") {
        const w = typeof meta.width === "number" ? meta.width : 200;
        const h = typeof meta.height === "number" ? meta.height : 80;
        const text = o.obj.text?.text ?? "";
        const fontSize = o.obj.text?.fontSize ?? 16;
        const font = o.obj.text?.font ?? "Inter";
        const color = o.obj.text?.textColor ?? "#111827";

        ctx.save();
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1 / scale;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = color;
        ctx.font = `${fontSize}px ${font}`;
        ctx.textBaseline = "top";

        const padding = 6;
        const maxWidth = Math.max(0, w - padding * 2);
        const words = text.split(/\\s+/);
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
        if (line && yy <= y + h - fontSize) ctx.fillText(line, x + padding, yy);
        ctx.restore();
        continue;
      }

      if (o.obj.type !== "shape") continue;

      if (meta.kind === "chip") {
        const r = typeof meta.radius === "number" ? meta.radius : 16;
        const fill = typeof o.obj.appearance?.fillColor === "string" ? o.obj.appearance.fillColor : "#3b82f6";
        const stroke = typeof o.obj.appearance?.strokeColor === "string" ? o.obj.appearance.strokeColor : "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2 / scale;
        ctx.stroke();
        continue;
      }

      this.shapePainter.draw({ ctx, obj: o.obj, scale });
    }

    // selection boxes
    if (selectedKeys.length > 0) {
      const selectedObjects = selectedKeys
        .map((k) => objects.find((o) => o.key === k))
        .filter(Boolean) as TableObjectState[];
      if (selectedObjects.length > 0) {
        for (const o of selectedObjects) {
          drawSelectionGlow(ctx, getObjectAabb(o), scale);
        }

        ctx.save();
        ctx.strokeStyle = "rgba(107, 143, 156, 0.85)";
        ctx.lineWidth = 2 / scale;
        ctx.setLineDash([4 / scale, 3 / scale]);
        if (selectedObjects.length === 1) {
          const aabb = getObjectAabb(selectedObjects[0]);
          ctx.strokeRect(aabb.left, aabb.top, aabb.right - aabb.left, aabb.bottom - aabb.top);
        } else {
          for (const o of selectedObjects) {
            const aabb = getObjectAabb(o);
            ctx.strokeRect(aabb.left, aabb.top, aabb.right - aabb.left, aabb.bottom - aabb.top);
          }
        }
        ctx.restore();

        // handles for single selection (MVP)
        if (selectedObjects.length === 1) {
          const primary =
            (primarySelectedKey ? objects.find((o) => o.key === primarySelectedKey) : null) ??
            selectedObjects[0];
          const meta: any = primary.obj.metadata ?? {};
          if (meta.kind !== "chip") {
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
            const hs = 6 / scale;

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

            ctx.beginPath();
            ctx.moveTo(pts.n.x, pts.n.y);
            ctx.lineTo(rotHandle.x, rotHandle.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(rotHandle.x, rotHandle.y, 6 / scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

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
    }

    // draft rect (shape/text tool)
    if (draftRect) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.setLineDash([6 / scale, 4 / scale]);
      ctx.strokeStyle = "rgba(79,70,229,0.9)";
      ctx.lineWidth = 2 / scale;
      if (draftShapeVariant) {
        ShapeVariantRegistry.get(draftShapeVariant).drawDraft(ctx, draftRect, scale);
      } else {
        const x1 = draftRect.start.x;
        const y1 = draftRect.start.y;
        const x2 = draftRect.end.x;
        const y2 = draftRect.end.y;
        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const w = Math.abs(x2 - x1);
        const h = Math.abs(y2 - y1);
        ctx.strokeRect(left, top, w, h);
      }
      ctx.restore();
    }

    ctx.restore();
  }
}

