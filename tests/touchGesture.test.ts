import { describe, expect, it } from "vitest";
import {
  classifyLongPressEnd,
  composePinchStagePos,
  computePinchScaleFactor,
  isShortTap,
  movementExceeded,
  shouldInitPinchBaseline,
} from "../frontend/src/pages/sessionTable/input/touchGesture";

describe("touchGesture", () => {
  it("detects movement beyond slop", () => {
    expect(movementExceeded({ x: 0, y: 0 }, { x: 5, y: 5 })).toBe(false);
    expect(movementExceeded({ x: 0, y: 0 }, { x: 20, y: 0 })).toBe(true);
  });

  it("classifies short tap", () => {
    expect(isShortTap(200, false)).toBe(true);
    expect(isShortTap(500, false)).toBe(false);
    expect(isShortTap(200, true)).toBe(false);
  });

  it("classifies long press end scenarios", () => {
    expect(
      classifyLongPressEnd({
        longPressFired: true,
        movedPastSlop: false,
        hadSelectionAtStart: true,
      })
    ).toBe("contextMenu");

    expect(
      classifyLongPressEnd({
        longPressFired: true,
        movedPastSlop: false,
        hadSelectionAtStart: false,
      })
    ).toBe("selectOnly");

    expect(
      classifyLongPressEnd({
        longPressFired: true,
        movedPastSlop: true,
        hadSelectionAtStart: false,
      })
    ).toBe("toolDrag");
  });

  it("detects when pinch baseline must be initialized", () => {
    expect(shouldInitPinchBaseline("idle", 0)).toBe(true);
    expect(shouldInitPinchBaseline("twoFinger", 0)).toBe(true);
    expect(shouldInitPinchBaseline("twoFinger", 120)).toBe(false);
  });

  it("returns null scale factor until baseline distance is set", () => {
    expect(computePinchScaleFactor(150, 0)).toBeNull();
    expect(computePinchScaleFactor(150, 100)).toBe(1.5);
  });

  it("composes pan on top of zoom-anchored stage position", () => {
    const pos = composePinchStagePos(
      { x: 10, y: 20 },
      { x: 100, y: 200 },
      { x: 110, y: 190 },
    );
    expect(pos).toEqual({ x: 20, y: 10 });
  });
});
