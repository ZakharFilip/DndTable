import { describe, expect, it, vi } from "vitest";
import { isDrawableImage, safeDrawImage } from "../frontend/src/tabletop/render/imageUtils";

describe("isDrawableImage", () => {
  it("returns false for complete but broken images (naturalWidth 0)", () => {
    const img = { complete: true, naturalWidth: 0, naturalHeight: 0 } as HTMLImageElement;
    expect(isDrawableImage(img)).toBe(false);
  });

  it("returns false while loading", () => {
    const img = { complete: false, naturalWidth: 100, naturalHeight: 80 } as HTMLImageElement;
    expect(isDrawableImage(img)).toBe(false);
  });

  it("returns true for loaded images with dimensions", () => {
    const img = { complete: true, naturalWidth: 100, naturalHeight: 80 } as HTMLImageElement;
    expect(isDrawableImage(img)).toBe(true);
  });
});

describe("safeDrawImage", () => {
  it("skips drawImage for broken images", () => {
    const drawImage = vi.fn();
    const ctx = { drawImage } as unknown as CanvasRenderingContext2D;
    const img = { complete: true, naturalWidth: 0, naturalHeight: 0 } as HTMLImageElement;
    safeDrawImage(ctx, img, 0, 0, 10, 10);
    expect(drawImage).not.toHaveBeenCalled();
  });

  it("calls drawImage for valid images", () => {
    const drawImage = vi.fn();
    const ctx = { drawImage } as unknown as CanvasRenderingContext2D;
    const img = { complete: true, naturalWidth: 10, naturalHeight: 10 } as HTMLImageElement;
    safeDrawImage(ctx, img, 0, 0, 10, 10);
    expect(drawImage).toHaveBeenCalledWith(img, 0, 0, 10, 10);
  });
});
