export const LONG_PRESS_MS = 400;
export const MOVEMENT_SLOP_PX = 10;
export const DOUBLE_TAP_MS = 300;
export const TOUCH_HANDLE_PX = 44;

export type TouchGesturePhase =
  | "idle"
  | "pending"
  | "pan"
  | "dragObject"
  | "longPressPending"
  | "marquee"
  | "shapeDraft"
  | "twoFinger";

export function movementExceeded(
  start: { x: number; y: number },
  current: { x: number; y: number },
  slop = MOVEMENT_SLOP_PX
): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) > slop;
}

export function isShortTap(elapsedMs: number, moved: boolean): boolean {
  return elapsedMs < LONG_PRESS_MS && !moved;
}

/** After long press fired, decide if pointer-up should open menu vs select-only. */
export function classifyLongPressEnd(params: {
  longPressFired: boolean;
  movedPastSlop: boolean;
  hadSelectionAtStart: boolean;
}): "toolDrag" | "contextMenu" | "selectOnly" | "none" {
  const { longPressFired, movedPastSlop, hadSelectionAtStart } = params;
  if (!longPressFired) return "none";
  if (movedPastSlop && !hadSelectionAtStart) return "toolDrag";
  if (!movedPastSlop && hadSelectionAtStart) return "contextMenu";
  if (!movedPastSlop && !hadSelectionAtStart) return "selectOnly";
  return "none";
}

export type PinchBaseline = {
  startDistance: number;
  startScale: number;
  startStagePos: { x: number; y: number };
  startMidpoint: { x: number; y: number };
};

/** True when pinch baseline must be captured on this frame (first two-finger move). */
export function shouldInitPinchBaseline(
  phase: TouchGesturePhase,
  startDistance: number,
): boolean {
  return phase !== "twoFinger" || startDistance <= 0;
}

export function computePinchScaleFactor(
  currentDistance: number,
  startDistance: number,
): number | null {
  if (startDistance <= 0) return null;
  return currentDistance / startDistance;
}

/** Pan delta applied on top of zoom-anchored stage position. */
export function composePinchStagePos(
  zoomedStagePos: { x: number; y: number },
  startMidpoint: { x: number; y: number },
  currentMidpoint: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: zoomedStagePos.x + (currentMidpoint.x - startMidpoint.x),
    y: zoomedStagePos.y + (currentMidpoint.y - startMidpoint.y),
  };
}
