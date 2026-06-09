import type { IShapeVariant } from "../ShapeVariant";

function draftBounds(draft: { start: { x: number; y: number }; end: { x: number; y: number } }) {
  const left = Math.min(draft.start.x, draft.end.x);
  const top = Math.min(draft.start.y, draft.end.y);
  const w = Math.abs(draft.end.x - draft.start.x);
  const h = Math.abs(draft.end.y - draft.start.y);
  return { left, top, w, h };
}

export const ellipseVariant: IShapeVariant = {
  id: "ellipse",
  label: "Окружность",
  appearanceShape: "ellipse",

  create(bounds, options) {
    return {
      id: options.key,
      type: "shape",
      transform: {
        position: { x: bounds.x, y: bounds.y, z: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        lockRotation: false,
        lockScale: false,
      },
      appearance: {
        shape: "ellipse",
        fillColor: options.fillColor ?? "#22c55e",
        strokeColor: options.strokeColor ?? "rgba(0,0,0,0.25)",
        ...(options.sprite ? { sprite: options.sprite } : {}),
      },
      metadata: {
        kind: "shape",
        shape: "ellipse",
        width: bounds.width,
        height: bounds.height,
      },
      groupId: null,
      layerId: null,
    };
  },

  drawDraft(ctx, draft, _scale) {
    const { left, top, w, h } = draftBounds(draft);
    const cx = left + w / 2;
    const cy = top + h / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  },
};
