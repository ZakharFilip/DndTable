import type { TabletopBaseObject } from "@dnd-table/shared";
import { CHIP_COLORS, CHIP_RADIUS } from "./constants";
import { createTabletopShape } from "./shapes";

export type Tool = "select" | "shape" | "text";

export interface Layer {
  id: string;
  key: string;
  version: number;
  name: string;
  order: number;
  visible: boolean;
  locked: boolean;
}

export interface TableObjectState {
  key: string;
  version: number;
  sortOrder: number;
  obj: TabletopBaseObject;
}

let objectIdCounter = 0;
export function nextObjectKey(prefix: string) {
  // stable client-side key; later can be uuid
  return `${prefix}-${Date.now()}-${++objectIdCounter}`;
}

export function randomColor() {
  return CHIP_COLORS[Math.floor(Math.random() * CHIP_COLORS.length)];
}

export function toTabletopChip(params: { key: string; x: number; y: number; color: string }): TabletopBaseObject {
  return {
    id: params.key,
    type: "shape",
    transform: {
      position: { x: params.x, y: params.y, z: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      lockRotation: false,
      lockScale: false,
    },
    appearance: {
      shape: "ellipse",
      fillColor: params.color,
      strokeColor: "rgba(0,0,0,0.25)",
    },
    metadata: { kind: "chip", radius: CHIP_RADIUS },
    groupId: null,
    layerId: null,
  };
}

export function toTabletopRect(params: {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: string;
}): TabletopBaseObject {
  return createTabletopShape(
    "rectangle",
    { x: params.x, y: params.y, width: params.width, height: params.height },
    { key: params.key, fillColor: params.fillColor ?? "#22c55e" }
  );
}

export function toTabletopText(params: {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
}): TabletopBaseObject {
  return {
    id: params.key,
    type: "text",
    transform: {
      position: { x: params.x, y: params.y, z: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      lockRotation: false,
      lockScale: false,
    },
    appearance: {
      fillColor: "rgba(255,255,255,0.0)",
      strokeColor: "rgba(0,0,0,0.25)",
    },
    text: {
      text: params.text ?? "",
      font: "Inter",
      fontSize: 16,
      textColor: "#111827",
      alignment: "left",
      fontWeight: "normal",
      fontStyle: "normal",
      lineHeight: 1.25,
    },
    metadata: { kind: "text", width: params.width, height: params.height },
    groupId: null,
    layerId: null,
  };
}

export function toTabletopImage(params: {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sprite: string; // dataURL or URL
}): TabletopBaseObject {
  return {
    id: params.key,
    type: "image",
    transform: {
      position: { x: params.x, y: params.y, z: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      lockRotation: false,
      lockScale: false,
    },
    appearance: {
      shape: "rectangle",
      sprite: params.sprite,
      tintColor: "#ffffff",
      strokeColor: "rgba(0,0,0,0.25)",
    },
    metadata: { kind: "image", width: params.width, height: params.height },
    groupId: null,
    layerId: null,
  };
}

export function objectFromDto(dto: {
  id: string;
  key?: string;
  version?: number;
  type: string;
  x: number;
  y: number;
  sortOrder?: number;
  props?: Record<string, unknown>;
}): TableObjectState | null {
  const key = dto.key ?? dto.id;
  const version = dto.version ?? 1;
  const sortOrder = dto.sortOrder ?? 0;
  const props = dto.props ?? {};

  // New format: props is TabletopBaseObject
  if (props && typeof props === "object" && "transform" in props && "type" in props) {
    const obj = props as unknown as TabletopBaseObject;
    return { key, version, sortOrder, obj: { ...obj, id: key } };
  }

  // Transitional: props.tabletop is TabletopBaseObject
  if (props && typeof props === "object" && "tabletop" in props) {
    const obj = (props as any).tabletop as TabletopBaseObject | undefined;
    if (!obj) return null;
    return { key, version, sortOrder, obj: { ...obj, id: key } };
  }

  // Legacy chip
  if (dto.type === "chip") {
    const color = typeof (props as any).color === "string" ? String((props as any).color) : "#3b82f6";
    const obj = toTabletopChip({ key, x: dto.x, y: dto.y, color });
    return { key, version, sortOrder, obj };
  }

  return null;
}

export function layerFromDto(dto: { id: string; key?: string; version?: number; type: string; props?: Record<string, unknown> }): Layer | null {
  if (dto.type !== "layer") return null;
  const layer = (dto.props as any)?.layer;
  if (!layer || typeof layer !== "object") return null;
  const key = dto.key ?? dto.id;
  const id = typeof layer.id === "string" ? layer.id : key;
  return {
    id,
    key,
    version: dto.version ?? 1,
    name: typeof layer.name === "string" ? layer.name : "Layer",
    order: typeof layer.order === "number" ? layer.order : 0,
    visible: layer.visible !== false,
    locked: layer.locked === true,
  };
}

