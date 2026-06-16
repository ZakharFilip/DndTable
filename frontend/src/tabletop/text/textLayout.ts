import type { TextAlignment } from "./textStyle";
import { buildCanvasFont, lineHeightPx, type ResolvedTextStyle } from "./textStyle";

export interface LaidOutLine {
  text: string;
  x: number;
  y: number;
  justify: boolean;
}

export interface TextBlockLayout {
  lines: LaidOutLine[];
}

export function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  if (maxWidth <= 0) return [text];

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }

  if (line) lines.push(line);
  return lines;
}

export function alignLineX(
  alignment: TextAlignment,
  x: number,
  padding: number,
  maxWidth: number,
  lineWidth: number
): number {
  if (alignment === "center") {
    return x + padding + Math.max(0, (maxWidth - lineWidth) / 2);
  }
  if (alignment === "right") {
    return x + padding + Math.max(0, maxWidth - lineWidth);
  }
  return x + padding;
}

export function justifyLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  maxWidth: number
): void {
  const words = line.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= 1) {
    ctx.fillText(line, x, y);
    return;
  }

  const spaceWidth = ctx.measureText(" ").width;
  const wordsWidth = words.reduce((sum, w) => sum + ctx.measureText(w).width, 0);
  const gaps = words.length - 1;
  const extra = Math.max(0, maxWidth - wordsWidth - gaps * spaceWidth);
  const gap = spaceWidth + extra / gaps;

  let cx = x;
  for (let i = 0; i < words.length; i++) {
    ctx.fillText(words[i], cx, y);
    if (i < words.length - 1) {
      cx += ctx.measureText(words[i]).width + gap;
    }
  }
}

export function layoutTextBlock(
  style: ResolvedTextStyle,
  ctx: CanvasRenderingContext2D,
  text: string,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
): TextBlockLayout {
  const padding = style.padding;
  const maxWidth = Math.max(0, boxW - padding * 2);
  const lineStep = lineHeightPx(style);
  const rawLines = wrapLines(ctx, text, maxWidth);

  const lines: LaidOutLine[] = [];
  let yy = boxY + padding;

  for (let i = 0; i < rawLines.length; i++) {
    if (yy > boxY + boxH - style.fontSize) break;

    const line = rawLines[i];
    const lineWidth = ctx.measureText(line).width;
    const isLast = i === rawLines.length - 1;
    const shouldJustify =
      style.alignment === "justify" && !isLast && line.split(/\s+/).filter(Boolean).length > 1;

    const lx = shouldJustify
      ? boxX + padding
      : alignLineX(style.alignment, boxX, padding, maxWidth, lineWidth);

    lines.push({
      text: line,
      x: lx,
      y: yy,
      justify: shouldJustify,
    });

    yy += lineStep;
  }

  return { lines };
}

export function applyCanvasTextStyle(
  ctx: CanvasRenderingContext2D,
  style: ResolvedTextStyle
): void {
  ctx.font = buildCanvasFont(style);
  ctx.fillStyle = style.textColor;
  ctx.textBaseline = "top";
}
