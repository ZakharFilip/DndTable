import { describe, expect, it } from "vitest";
import {
  classifyLongPressEnd,
  isShortTap,
  movementExceeded,
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
});
