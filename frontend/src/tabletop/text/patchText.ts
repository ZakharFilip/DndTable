import type { TabletopAppearance, TabletopBaseObject, TabletopText } from "@dnd-table/shared";

const EMPTY_TEXT: TabletopText = {
  text: "",
  font: "Inter",
  fontSize: 16,
  textColor: "#111827",
  alignment: "left",
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1.25,
};

export function patchTextProps(
  obj: TabletopBaseObject,
  partial: Partial<TabletopText>
): TabletopBaseObject {
  if (obj.type !== "text") return obj;
  return {
    ...obj,
    text: { ...EMPTY_TEXT, ...obj.text, ...partial },
  };
}

export function patchTextAppearance(
  obj: TabletopBaseObject,
  partial: Partial<TabletopAppearance>
): TabletopBaseObject {
  return {
    ...obj,
    appearance: { ...(obj.appearance ?? {}), ...partial },
  };
}
