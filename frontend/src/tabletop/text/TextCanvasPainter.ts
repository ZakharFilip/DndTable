import type { TabletopBaseObject } from "@dnd-table/shared";
import { isTransparentFill } from "../appearance/ShapeFill";
import { applyCanvasTextStyle, justifyLine, layoutTextBlock } from "./textLayout";
import { resolveTextStyle } from "./textStyle";

export class TextCanvasPainter {
  draw(params: {
    ctx: CanvasRenderingContext2D;
    obj: TabletopBaseObject;
    scale: number;
  }): void {
    const { ctx, obj, scale } = params;
    const style = resolveTextStyle(obj);
    if (!style) return;

    const x = obj.transform.position.x;
    const y = obj.transform.position.y;
    const w = style.width;
    const h = style.height;
    const deg = obj.transform.rotation ?? 0;
    const rad = (deg * Math.PI) / 180;

    const fillColor = obj.appearance?.fillColor;
    const strokeColor =
      typeof obj.appearance?.strokeColor === "string"
        ? obj.appearance.strokeColor
        : "rgba(0,0,0,0.15)";

    ctx.save();

    if (deg) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(rad);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }

    if (fillColor && !isTransparentFill(fillColor)) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, w, h);
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1 / scale;
    ctx.strokeRect(x, y, w, h);

    const textBg = style.textBackgroundColor;
    if (textBg && !isTransparentFill(textBg)) {
      const pad = style.padding;
      ctx.fillStyle = textBg;
      ctx.fillRect(x + pad, y + pad, Math.max(0, w - pad * 2), Math.max(0, h - pad * 2));
    }

    applyCanvasTextStyle(ctx, style);
    const layout = layoutTextBlock(style, ctx, style.text, x, y, w, h);
    const maxWidth = Math.max(0, w - style.padding * 2);

    for (const line of layout.lines) {
      if (line.justify) {
        justifyLine(ctx, line.text, line.x, line.y, maxWidth);
      } else {
        ctx.fillText(line.text, line.x, line.y);
      }
    }

    ctx.restore();
  }
}
