import type { TabletopBaseObject, TabletopText } from "@dnd-table/shared";
import type { CSSProperties } from "react";

export type TextAlignment = "left" | "center" | "right" | "justify";

export interface ResolvedTextStyle {
  text: string;
  font: string;
  fontSize: number;
  textColor: string;
  alignment: TextAlignment;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textBackgroundColor: string | undefined;
  lineHeight: number;
  padding: number;
  width: number;
  height: number;
}

const DEFAULT_TEXT: TabletopText = {
  text: "",
  font: "Inter",
  fontSize: 16,
  textColor: "#111827",
  alignment: "left",
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1.25,
};

export function resolveTextStyle(obj: TabletopBaseObject): ResolvedTextStyle | null {
  if (obj.type !== "text") return null;

  const meta = (obj.metadata as { width?: number; height?: number } | undefined) ?? {};
  const t = { ...DEFAULT_TEXT, ...(obj.text ?? {}) };

  return {
    text: t.text ?? "",
    font: t.font ?? "Inter",
    fontSize: typeof t.fontSize === "number" && t.fontSize > 0 ? t.fontSize : 16,
    textColor: t.textColor ?? "#111827",
    alignment: (t.alignment ?? "left") as TextAlignment,
    fontWeight: t.fontWeight === "bold" ? "bold" : "normal",
    fontStyle: t.fontStyle === "italic" ? "italic" : "normal",
    textBackgroundColor:
      typeof t.textBackgroundColor === "string" && t.textBackgroundColor.length > 0
        ? t.textBackgroundColor
        : undefined,
    lineHeight: typeof t.lineHeight === "number" && t.lineHeight > 0 ? t.lineHeight : 1.25,
    padding: 6,
    width: typeof meta.width === "number" && meta.width > 0 ? meta.width : 200,
    height: typeof meta.height === "number" && meta.height > 0 ? meta.height : 80,
  };
}

export function buildCanvasFont(style: Pick<ResolvedTextStyle, "fontStyle" | "fontWeight" | "fontSize" | "font">): string {
  const parts: string[] = [];
  if (style.fontStyle === "italic") parts.push("italic");
  if (style.fontWeight === "bold") parts.push("bold");
  parts.push(`${style.fontSize}px`);
  parts.push(style.font);
  return parts.join(" ");
}

export function lineHeightPx(style: Pick<ResolvedTextStyle, "fontSize" | "lineHeight">): number {
  return style.fontSize * style.lineHeight;
}

export function toOverlayCss(style: ResolvedTextStyle): CSSProperties {
  return {
    fontFamily: style.font,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    color: style.textColor,
    textAlign: style.alignment === "justify" ? "justify" : style.alignment,
    lineHeight: style.lineHeight,
    backgroundColor: style.textBackgroundColor ?? undefined,
  };
}
