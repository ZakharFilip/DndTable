import { describe, expect, it } from "vitest";
import { validateSpriteInProps } from "../backend/src/modules/gamesessions/table-patch";

describe("validateSpriteInProps", () => {
  it("allows normal session sprite paths", () => {
    expect(
      validateSpriteInProps({
        appearance: { sprite: "/session-sprites/abc/123.jpg" },
      })
    ).toBeNull();
  });

  it("rejects inline data URLs", () => {
    expect(
      validateSpriteInProps({
        appearance: { sprite: "data:image/png;base64,abc" },
      })
    ).toBe("INLINE_SPRITE_NOT_ALLOWED");
  });

  it("rejects oversized sprite paths", () => {
    expect(
      validateSpriteInProps({
        appearance: { sprite: "/session-sprites/x/" + "a".repeat(600) },
      })
    ).toBe("SPRITE_PATH_TOO_LONG");
  });

  it("ignores props without sprite", () => {
    expect(validateSpriteInProps({ appearance: { fillColor: "#fff" } })).toBeNull();
    expect(validateSpriteInProps(undefined)).toBeNull();
  });
});
