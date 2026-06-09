import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { worldToScreen } from "../../../tabletop/geometry";
import type { TableObjectState } from "../../../tabletop/model";

interface TextEditOverlayProps {
  editingObject: TableObjectState;
  editingText: string;
  setEditingText: (s: string) => void;
  stagePos: { x: number; y: number };
  scale: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  stageSize: { width: number; height: number };
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
  const meta = (o.obj.metadata as { width?: number; height?: number } | undefined) ?? {};
  const w = typeof meta.width === "number" ? meta.width : 200;
  const h = typeof meta.height === "number" ? meta.height : 80;
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
      className="fixed z-50 p-2 text-sm bg-surface/95 border border-primary rounded shadow-card"
      style={{ left, top, width, height, resize: "none" }}
    />,
    document.body
  );
}
