import type { ResizeHandle } from "./handles";

const ANCHOR: Record<ResizeHandle, ResizeHandle> = {
  nw: "se",
  n: "s",
  ne: "sw",
  e: "w",
  se: "nw",
  s: "n",
  sw: "ne",
  w: "e",
};

function handleLocalFromCenter(handle: ResizeHandle, w: number, h: number) {
  const hw = w / 2;
  const hh = h / 2;
  switch (handle) {
    case "nw":
      return { x: -hw, y: -hh };
    case "n":
      return { x: 0, y: -hh };
    case "ne":
      return { x: hw, y: -hh };
    case "e":
      return { x: hw, y: 0 };
    case "se":
      return { x: hw, y: hh };
    case "s":
      return { x: 0, y: hh };
    case "sw":
      return { x: -hw, y: hh };
    case "w":
      return { x: -hw, y: 0 };
  }
}

function localToWorld(cx: number, cy: number, local: { x: number; y: number }, rad: number) {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: cx + local.x * cos - local.y * sin,
    y: cy + local.x * sin + local.y * cos,
  };
}

function worldToLocalDelta(dx: number, dy: number, rad: number) {
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos,
  };
}

const MIN_SIZE = 4;

/** Resize with fixed opposite anchor; supports rotation. */
export function resizeFromPointer(params: {
  handle: ResizeHandle;
  start: { x: number; y: number; width: number; height: number; rotation: number };
  anchorWorld: { x: number; y: number };
  pointerWorld: { x: number; y: number };
}): { x: number; y: number; width: number; height: number } {
  const { handle, start, anchorWorld, pointerWorld } = params;
  const rad = (start.rotation * Math.PI) / 180;
  const { x: ldx, y: ldy } = worldToLocalDelta(
    pointerWorld.x - anchorWorld.x,
    pointerWorld.y - anchorWorld.y,
    rad
  );

  let width = start.width;
  let height = start.height;
  switch (handle) {
    case "se":
      width = ldx;
      height = ldy;
      break;
    case "nw":
      width = -ldx;
      height = -ldy;
      break;
    case "ne":
      width = ldx;
      height = -ldy;
      break;
    case "sw":
      width = -ldx;
      height = ldy;
      break;
    case "e":
      width = ldx;
      break;
    case "w":
      width = -ldx;
      break;
    case "s":
      height = ldy;
      break;
    case "n":
      height = -ldy;
      break;
  }

  width = Math.max(MIN_SIZE, width);
  height = Math.max(MIN_SIZE, height);

  const anchorHandle = ANCHOR[handle];
  const anchorLocal = handleLocalFromCenter(anchorHandle, width, height);
  const center = {
    x: anchorWorld.x - (anchorLocal.x * Math.cos(rad) - anchorLocal.y * Math.sin(rad)),
    y: anchorWorld.y - (anchorLocal.x * Math.sin(rad) + anchorLocal.y * Math.cos(rad)),
  };

  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
  };
}

export function anchorWorldAtStart(start: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  handle: ResizeHandle;
}): { x: number; y: number } {
  const rad = (start.rotation * Math.PI) / 180;
  const cx = start.x + start.width / 2;
  const cy = start.y + start.height / 2;
  const anchorHandle = ANCHOR[start.handle];
  const anchorLocal = handleLocalFromCenter(anchorHandle, start.width, start.height);
  return localToWorld(cx, cy, anchorLocal, rad);
}
