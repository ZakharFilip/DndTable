import { describe, expect, it } from "vitest";
import { toTabletopText } from "../frontend/src/tabletop/model";
import { TextCanvasPainter } from "../frontend/src/tabletop/text/TextCanvasPainter";
import {
  alignLineX,
  justifyLine,
  layoutTextBlock,
  wrapLines,
} from "../frontend/src/tabletop/text/textLayout";
import { resolveTextStyle } from "../frontend/src/tabletop/text/textStyle";

function mockCtx(widths: Record<string, number> = {}): CanvasRenderingContext2D {
  const defaultWidth = (s: string) => s.length * 8;
  return {
    measureText: (s: string) => ({ width: widths[s] ?? defaultWidth(s) }),
    fillText: () => {},
    font: "",
    fillStyle: "",
    textBaseline: "top",
  } as unknown as CanvasRenderingContext2D;
}

describe("textLayout", () => {
  it("wrapLines returns empty for empty text", () => {
    const ctx = mockCtx();
    expect(wrapLines(ctx, "", 100)).toEqual([]);
  });

  it("wrapLines wraps long line", () => {
    const ctx = mockCtx();
    const lines = wrapLines(ctx, "one two three four five", 50);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toContain("one");
  });

  it("wrapLines keeps single word wider than maxWidth", () => {
    const ctx = mockCtx({ superlongword: 200 });
    const lines = wrapLines(ctx, "superlongword", 50);
    expect(lines).toEqual(["superlongword"]);
  });

  it("alignLineX positions left center right", () => {
    expect(alignLineX("left", 10, 6, 100, 40)).toBe(16);
    expect(alignLineX("center", 10, 6, 100, 40)).toBe(46);
    expect(alignLineX("right", 10, 6, 100, 40)).toBe(76);
  });

  it("justifyLine does not throw for single word", () => {
    const ctx = mockCtx();
    expect(() => justifyLine(ctx, "word", 0, 0, 100)).not.toThrow();
  });

  it("layoutTextBlock marks middle lines for justify", () => {
    const ctx = mockCtx();
    const style = resolveTextStyle(
      toTabletopText({
        key: "t1",
        x: 0,
        y: 0,
        width: 82,
        height: 200,
        text: "aa bb cc dd ee ff gg",
      })
    )!;
    style.alignment = "justify";
    const layout = layoutTextBlock(style, ctx, style.text, 0, 0, style.width, style.height);
    expect(layout.lines.length).toBeGreaterThan(1);
    const justified = layout.lines.filter((l) => l.justify);
    expect(justified.length).toBeGreaterThan(0);
    const last = layout.lines[layout.lines.length - 1];
    expect(last.justify).toBe(false);
  });
});

describe("resolveTextStyle", () => {
  it("applies defaults for legacy text object without new fields", () => {
    const obj = toTabletopText({ key: "t1", x: 0, y: 0, width: 120, height: 60, text: "hi" });
    delete (obj.text as Record<string, unknown>).fontWeight;
    delete (obj.text as Record<string, unknown>).fontStyle;
    delete (obj.text as Record<string, unknown>).lineHeight;

    const style = resolveTextStyle(obj);
    expect(style).not.toBeNull();
    expect(style!.fontWeight).toBe("normal");
    expect(style!.fontStyle).toBe("normal");
    expect(style!.alignment).toBe("left");
    expect(style!.lineHeight).toBe(1.25);
    expect(style!.fontSize).toBe(16);
  });
});

describe("TextCanvasPainter", () => {
  it("draws legacy and new text objects without throwing", () => {
    const legacy = toTabletopText({ key: "t1", x: 0, y: 0, width: 100, height: 50, text: "old" });
    delete (legacy.text as Record<string, unknown>).fontWeight;

    const modern = toTabletopText({ key: "t2", x: 10, y: 10, width: 100, height: 50, text: "new" });
    if (modern.text) {
      modern.text.fontWeight = "bold";
      modern.text.fontStyle = "italic";
      modern.text.alignment = "center";
      modern.text.textBackgroundColor = "#fef3c7";
    }

    const ctx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      fillText: () => {},
      measureText: (s: string) => ({ width: s.length * 8 }),
      font: "",
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      textBaseline: "top",
    } as unknown as CanvasRenderingContext2D;

    const painter = new TextCanvasPainter();
    expect(() => painter.draw({ ctx, obj: legacy, scale: 1 })).not.toThrow();
    expect(() => painter.draw({ ctx, obj: modern, scale: 1 })).not.toThrow();
  });
});
