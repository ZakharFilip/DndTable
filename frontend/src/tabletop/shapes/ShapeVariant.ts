import type { TabletopBaseObject } from "@dnd-table/shared";
import type { ShapeVariantId } from "./ShapeVariantId";

export interface ShapeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CreateShapeOptions {
  key: string;
  fillColor?: string;
  strokeColor?: string;
  sprite?: string;
}

export interface DraftRect {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export interface IShapeVariant {
  readonly id: ShapeVariantId;
  readonly label: string;
  readonly appearanceShape: "rectangle" | "ellipse";
  create(bounds: ShapeBounds, options: CreateShapeOptions): TabletopBaseObject;
  drawDraft(ctx: CanvasRenderingContext2D, draft: DraftRect, scale: number): void;
}
