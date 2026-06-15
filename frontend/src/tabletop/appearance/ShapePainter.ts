import type { TabletopBaseObject } from "@dnd-table/shared";
import { isTransparentFill } from "./ShapeFill";
import { isDrawableImage, safeDrawImage } from "../render/imageUtils";

type ShapeMeta = { width?: number; height?: number };

function traceShapePath(
  ctx: CanvasRenderingContext2D,
  shape: "rectangle" | "ellipse",
  w: number,
  h: number
) {
  if (shape === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else {
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
  }
}

export class ShapePainter {
  private getOrLoadImage: (sprite: string) => HTMLImageElement;

  constructor(getOrLoadImage: (sprite: string) => HTMLImageElement) {
    this.getOrLoadImage = getOrLoadImage;
  }

  /** Draw a resizable shape body (not chips). */
  draw(params: {
    ctx: CanvasRenderingContext2D;
    obj: TabletopBaseObject;
    scale: number;
  }): void {
    const { ctx, obj, scale } = params;
    const meta = (obj.metadata ?? {}) as ShapeMeta;
    const x = obj.transform.position.x;
    const y = obj.transform.position.y;
    const w = typeof meta.width === "number" ? meta.width : 120;
    const h = typeof meta.height === "number" ? meta.height : 80;
    const shape = obj.appearance?.shape ?? "rectangle";
    const fill =
      typeof obj.appearance?.fillColor === "string" ? obj.appearance.fillColor : "#3b82f6";
    const stroke =
      typeof obj.appearance?.strokeColor === "string"
        ? obj.appearance.strokeColor
        : "rgba(0,0,0,0.25)";
    const deg = obj.transform.rotation ?? 0;
    const rad = (deg * Math.PI) / 180;
    const sprite = typeof obj.appearance?.sprite === "string" ? obj.appearance.sprite : "";

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    if (deg) ctx.rotate(rad);

    if (sprite) {
      const img = this.getOrLoadImage(sprite);
      if (isDrawableImage(img)) {
        ctx.save();
        traceShapePath(ctx, shape, w, h);
        ctx.clip();
        safeDrawImage(ctx, img, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }

    if (!isTransparentFill(fill)) {
      traceShapePath(ctx, shape, w, h);
      ctx.fillStyle = fill;
      ctx.fill();
    }

    traceShapePath(ctx, shape, w, h);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2 / scale;
    ctx.stroke();

    ctx.restore();
  }
}
