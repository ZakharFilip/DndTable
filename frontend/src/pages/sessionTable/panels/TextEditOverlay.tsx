import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { worldToScreen } from "../../../tabletop/geometry";
import type { TableObjectState } from "../../../tabletop/model";
import { resolveTextStyle, toOverlayCss } from "../../../tabletop/text";
import { isTransparentFill } from "../../../tabletop/appearance";

interface TextEditOverlayProps {
  editingObject: TableObjectState;
  editingText: string;
  setEditingText: (s: string) => void;
  stagePos: { x: number; y: number };
  scale: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  stageSize: { width: number; height: number };
  isCoarsePointer?: boolean;
  onCancel: () => void;
  onCommit: (text: string) => void;
}

export function TextEditOverlay({
  editingObject,
  editingText,
  setEditingText,
  stagePos,
  scale,
  canvasRef,
  stageSize,
  isCoarsePointer,
  onCancel,
  onCommit,
}: TextEditOverlayProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    try {
      ref.current?.focus({ preventScroll: true });
    } catch {
      ref.current?.focus();
    }
  }, []);

  const o = editingObject;
  if (o.obj.type !== "text") return null;
  const style = resolveTextStyle(o.obj);
  if (!style) return null;
  const w = style.width;
  const h = style.height;
  const p = o.obj.transform.position;
  const s = worldToScreen(p.x, p.y, stagePos, scale);
  const canvas = canvasRef.current;
  const rect = canvas?.getBoundingClientRect();
  const cw = canvas?.width ?? stageSize.width;
  const ch = canvas?.height ?? stageSize.height;

  const pad = 8;
  const cssX = rect ? rect.left + (s.x / Math.max(1, cw)) * rect.width : s.x;
  const cssY = rect ? rect.top + (s.y / Math.max(1, ch)) * rect.height : s.y;
  const cssW = rect ? ((w * scale) / Math.max(1, cw)) * rect.width : w * scale;
  const cssH = rect ? ((h * scale) / Math.max(1, ch)) * rect.height : h * scale;

  const boundLeft = rect ? rect.left + pad : pad;
  const boundTop = rect ? rect.top + pad : pad;
  const boundRight = rect ? rect.right - pad : window.innerWidth - pad;
  const boundBottom = rect ? rect.bottom - pad : window.innerHeight - pad;

  const width = Math.min(boundRight - boundLeft, Math.max(80, cssW));
  const height = Math.min(boundBottom - boundTop, Math.max(40, cssH));
  const left = Math.min(boundRight - width, Math.max(boundLeft, cssX));
  const top = Math.min(boundBottom - height, Math.max(boundTop, cssY));

  const overlayCss = toOverlayCss(style);
  const boxFill = o.obj.appearance?.fillColor;
  const overlayBg =
    style.textBackgroundColor ??
    (boxFill && !isTransparentFill(boxFill) ? boxFill : undefined);

  return createPortal(
    <textarea
      ref={ref}
      value={editingText}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onChange={(e) => setEditingText(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onCancel();
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          (e.currentTarget as HTMLTextAreaElement).blur();
        }
      }}
      onBlur={() => onCommit(editingText)}
      className="fixed z-50 border border-primary rounded shadow-card"
      style={{
        ...overlayCss,
        left,
        top,
        width,
        height,
        resize: "none",
        padding: style.padding,
        backgroundColor: overlayBg ?? overlayCss.backgroundColor ?? "rgba(255,255,255,0.95)",
        fontSize: isCoarsePointer ? Math.max(style.fontSize, 16) : style.fontSize,
        boxSizing: "border-box",
      }}
    />,
    document.body
  );
}
