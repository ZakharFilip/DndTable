import type { TabletopBaseObject } from "@dnd-table/shared";
import type { TextAlignment } from "../../../tabletop/text";
import { patchTextAppearance, patchTextProps, resolveTextStyle } from "../../../tabletop/text";
import { TRANSPARENT_FILL, isTransparentFill } from "../../../tabletop/appearance";
import type { TableObjectState } from "../../../tabletop/model";

type Meta = { width?: number; height?: number };

const getMeta = (o: TabletopBaseObject): Meta => (o.metadata as Meta | undefined) ?? {};

function colorForPicker(color: string | undefined, fallback = "#111827"): string {
  if (!color || isTransparentFill(color) || !color.startsWith("#")) return fallback;
  return color.length === 7 ? color : fallback;
}

const ALIGNMENTS: { id: TextAlignment; label: string; title: string }[] = [
  { id: "left", label: "≡", title: "По левому краю" },
  { id: "center", label: "≡", title: "По центру" },
  { id: "right", label: "≡", title: "По правому краю" },
  { id: "justify", label: "≣", title: "По ширине" },
];

interface TextInspectorSectionProps {
  selected: TableObjectState;
  locked: boolean;
  onUpdateLocal: (key: string, updater: (o: TableObjectState) => TableObjectState) => void;
  onCommit: (key: string) => void;
}

export function TextInspectorSection({
  selected,
  locked,
  onUpdateLocal,
  onCommit,
}: TextInspectorSectionProps) {
  const obj = selected.obj;
  if (obj.type !== "text") return null;

  const style = resolveTextStyle(obj);
  if (!style) return null;

  const meta = getMeta(obj);
  const textBgTransparent = !style.textBackgroundColor || isTransparentFill(style.textBackgroundColor);
  const boxBgTransparent = isTransparentFill(obj.appearance?.fillColor);

  const patchText = (partial: Parameters<typeof patchTextProps>[1]) => {
    onUpdateLocal(selected.key, (o) => ({
      ...o,
      obj: patchTextProps(o.obj, partial),
    }));
  };

  const patchAppearance = (partial: { fillColor?: string; strokeColor?: string }) => {
    onUpdateLocal(selected.key, (o) => ({
      ...o,
      obj: patchTextAppearance(o.obj, partial),
    }));
  };

  return (
    <div className="space-y-3 border border-border rounded p-2 bg-background">
      <div className="text-xs font-medium text-text-secondary">Текст</div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-text-secondary">
          Ширина
          <input
            className="mt-1 w-full px-2 py-1 border border-border rounded text-sm"
            type="number"
            min={1}
            value={Number(meta.width ?? 200)}
            disabled={locked}
            onChange={(e) => {
              const v = Math.max(1, Number(e.target.value));
              onUpdateLocal(selected.key, (o) => ({
                ...o,
                obj: { ...o.obj, metadata: { ...getMeta(o.obj), width: v } },
              }));
            }}
            onBlur={() => onCommit(selected.key)}
          />
        </label>
        <label className="text-xs text-text-secondary">
          Высота
          <input
            className="mt-1 w-full px-2 py-1 border border-border rounded text-sm"
            type="number"
            min={1}
            value={Number(meta.height ?? 80)}
            disabled={locked}
            onChange={(e) => {
              const v = Math.max(1, Number(e.target.value));
              onUpdateLocal(selected.key, (o) => ({
                ...o,
                obj: { ...o.obj, metadata: { ...getMeta(o.obj), height: v } },
              }));
            }}
            onBlur={() => onCommit(selected.key)}
          />
        </label>
      </div>

      <label className="text-xs text-text-secondary block">
        Размер шрифта
        <input
          className="mt-1 w-full px-2 py-1 border border-border rounded text-sm"
          type="number"
          min={8}
          max={200}
          value={Number(style.fontSize)}
          disabled={locked}
          onChange={(e) => patchText({ fontSize: Math.max(8, Math.min(200, Number(e.target.value))) })}
          onBlur={() => onCommit(selected.key)}
        />
      </label>

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary">Стиль</span>
        <button
          type="button"
          disabled={locked}
          className={[
            "px-2 py-1 text-xs border border-border rounded font-bold",
            style.fontWeight === "bold" ? "bg-primary-muted border-primary/40" : "bg-surface hover:bg-background",
            locked ? "opacity-50" : "",
          ].join(" ")}
          onClick={() => {
            patchText({ fontWeight: style.fontWeight === "bold" ? "normal" : "bold" });
            onCommit(selected.key);
          }}
        >
          B
        </button>
        <button
          type="button"
          disabled={locked}
          className={[
            "px-2 py-1 text-xs border border-border rounded italic",
            style.fontStyle === "italic" ? "bg-primary-muted border-primary/40" : "bg-surface hover:bg-background",
            locked ? "opacity-50" : "",
          ].join(" ")}
          onClick={() => {
            patchText({ fontStyle: style.fontStyle === "italic" ? "normal" : "italic" });
            onCommit(selected.key);
          }}
        >
          I
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-text-secondary">
          Цвет текста
          <input
            className="mt-1 w-full h-9 border border-border rounded"
            type="color"
            value={colorForPicker(style.textColor, "#111827")}
            disabled={locked}
            onChange={(e) => patchText({ textColor: e.target.value })}
            onBlur={() => onCommit(selected.key)}
          />
        </label>
        <label className="text-xs text-text-secondary">
          Фон текста{textBgTransparent ? " (нет)" : ""}
          <input
            className="mt-1 w-full h-9 border border-border rounded"
            type="color"
            value={colorForPicker(style.textBackgroundColor, "#fef3c7")}
            disabled={locked}
            onChange={(e) => patchText({ textBackgroundColor: e.target.value })}
            onBlur={() => onCommit(selected.key)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={locked || textBgTransparent}
          className="px-2 py-1 text-xs border border-border rounded bg-surface hover:bg-background disabled:opacity-50"
          onClick={() => {
            patchText({ textBackgroundColor: undefined });
            onCommit(selected.key);
          }}
        >
          Без фона текста
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-text-secondary">
          Фон объекта{boxBgTransparent ? " (прозрачный)" : ""}
          <input
            className="mt-1 w-full h-9 border border-border rounded"
            type="color"
            value={colorForPicker(obj.appearance?.fillColor, "#ffffff")}
            disabled={locked}
            onChange={(e) => patchAppearance({ fillColor: e.target.value })}
            onBlur={() => onCommit(selected.key)}
          />
        </label>
        <label className="text-xs text-text-secondary">
          Рамка
          <input
            className="mt-1 w-full h-9 border border-border rounded"
            type="color"
            value={colorForPicker(obj.appearance?.strokeColor, "#000000")}
            disabled={locked}
            onChange={(e) => patchAppearance({ strokeColor: e.target.value })}
            onBlur={() => onCommit(selected.key)}
          />
        </label>
      </div>

      <button
        type="button"
        disabled={locked || boxBgTransparent}
        className="px-2 py-1 text-xs border border-border rounded bg-surface hover:bg-background disabled:opacity-50"
        onClick={() => {
          patchAppearance({ fillColor: TRANSPARENT_FILL });
          onCommit(selected.key);
        }}
      >
        Без фона объекта
      </button>

      <div>
        <div className="text-xs text-text-secondary mb-1">Выравнивание</div>
        <div className="flex gap-1">
          {ALIGNMENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              title={a.title}
              disabled={locked}
              className={[
                "flex-1 px-2 py-1 text-sm border border-border rounded",
                style.alignment === a.id
                  ? "bg-primary-muted border-primary/40"
                  : "bg-surface hover:bg-background",
                locked ? "opacity-50" : "",
                a.id === "center" ? "text-center" : a.id === "right" ? "text-right" : "",
              ].join(" ")}
              onClick={() => {
                patchText({ alignment: a.id });
                onCommit(selected.key);
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
