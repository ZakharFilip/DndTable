import { useEffect, useRef, useState } from "react";
import { useCoarsePointer } from "../../../hooks/useCoarsePointer";
import type { Tool } from "../../../tabletop/model";
import { ShapeVariantRegistry, type ShapeVariantId } from "../../../tabletop/shapes";

interface ToolsToolbarProps {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
  activeShapeVariant: ShapeVariantId;
  onShapeVariantChange: (variant: ShapeVariantId) => void;
}

function SelectIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    </svg>
  );
}

function RectangleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="6" width="16" height="12" rx="1" />
    </svg>
  );
}

function EllipseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="12" rx="8" ry="6" />
    </svg>
  );
}

function TextIcon() {
  return <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1 }}>T</span>;
}

function ChevronDownIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ShapeVariantList({
  activeShapeVariant,
  onPick,
}: {
  activeShapeVariant: ShapeVariantId;
  onPick: (id: ShapeVariantId) => void;
}) {
  const shapeVariants = ShapeVariantRegistry.list();
  return (
    <>
      {shapeVariants.map((variant) => (
        <button
          key={variant.id}
          type="button"
          className={[
            "st-shape-dropdown-item",
            activeShapeVariant === variant.id ? "st-shape-dropdown-item--active" : "",
          ].join(" ")}
          onClick={() => onPick(variant.id)}
        >
          {variant.id === "ellipse" ? <EllipseIcon /> : <RectangleIcon />}
          {variant.label}
        </button>
      ))}
    </>
  );
}

export function ToolsToolbar({
  currentTool,
  onToolChange,
  activeShapeVariant,
  onShapeVariantChange,
}: ToolsToolbarProps) {
  const isCoarsePointer = useCoarsePointer();
  const [variantOpen, setVariantOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!variantOpen) return;
    const closeIfOutside = (target: EventTarget | null) => {
      if (dropdownRef.current && target && !dropdownRef.current.contains(target as Node)) {
        setVariantOpen(false);
      }
    };
    const onMouseDown = (e: MouseEvent) => closeIfOutside(e.target);
    const onTouchStart = (e: TouchEvent) => closeIfOutside(e.target);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("touchstart", onTouchStart);
    };
  }, [variantOpen]);

  const pickVariant = (id: ShapeVariantId) => {
    onShapeVariantChange(id);
    onToolChange("shape");
    setVariantOpen(false);
  };

  const openVariantPicker = () => {
    onToolChange("shape");
    setVariantOpen((v) => !v);
  };

  const ShapeIcon = activeShapeVariant === "ellipse" ? EllipseIcon : RectangleIcon;

  return (
    <div className="st-toolbar-anchor">
      <div className="st-toolbar">
        <button
          type="button"
          className={["st-tool-btn", currentTool === "select" ? "st-tool-btn--active" : ""].join(" ")}
          onClick={() => onToolChange("select")}
          title="Выделение"
        >
          <SelectIcon />
        </button>

        <div ref={dropdownRef} className="st-shape-tool-wrap">
          {isCoarsePointer ? (
            <button
              type="button"
              className={["st-tool-btn st-shape-tool-btn", currentTool === "shape" ? "st-tool-btn--active" : ""].join(" ")}
              onClick={openVariantPicker}
              title="Фигура — выбрать форму"
            >
              <ShapeIcon />
            </button>
          ) : (
            <div className="st-shape-tool-split">
              <button
                type="button"
                className={["st-tool-btn", currentTool === "shape" ? "st-tool-btn--active" : ""].join(" ")}
                onClick={() => onToolChange("shape")}
                title="Фигура"
              >
                <ShapeIcon />
              </button>
              <button
                type="button"
                className={["st-tool-btn st-shape-chevron", currentTool === "shape" ? "st-tool-btn--active" : ""].join(" ")}
                onClick={openVariantPicker}
                title="Выбрать форму"
              >
                <ChevronDownIcon />
              </button>
            </div>
          )}

          {variantOpen && (
            <div className="st-shape-dropdown dropdown-panel">
              <ShapeVariantList activeShapeVariant={activeShapeVariant} onPick={pickVariant} />
            </div>
          )}
        </div>

        <button
          type="button"
          className={["st-tool-btn", currentTool === "text" ? "st-tool-btn--active" : ""].join(" ")}
          onClick={() => onToolChange("text")}
          title="Текст"
        >
          <TextIcon />
        </button>
      </div>
      {isCoarsePointer && variantOpen && (
        <div
          className="st-shape-backdrop"
          aria-hidden
          onClick={() => setVariantOpen(false)}
        />
      )}
    </div>
  );
}
