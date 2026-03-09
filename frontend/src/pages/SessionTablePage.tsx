import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

const CHIP_RADIUS = 16;
const GRID_SIZE = 24;
const CHIP_COLORS = ["#ef4444", "#22c55e", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#f97316"];
/** Запас вокруг видимой области для отрисовки/хит-теста фишек (в пикселях экрана) */
const VIEW_MARGIN = 50;

interface Chip {
  id: string;
  x: number;
  y: number;
  color: string;
}

let chipIdCounter = 0;
function nextChipId() {
  return `chip-${++chipIdCounter}`;
}

function randomColor() {
  return CHIP_COLORS[Math.floor(Math.random() * CHIP_COLORS.length)];
}

function screenToWorld(
  sx: number,
  sy: number,
  stagePos: { x: number; y: number },
  scale: number
): { x: number; y: number } {
  return {
    x: (sx - stagePos.x) / scale,
    y: (sy - stagePos.y) / scale,
  };
}

/** Видимый прямоугольник в мировых координатах (с запасом VIEW_MARGIN) */
function getVisibleWorldRect(
  stagePos: { x: number; y: number },
  scale: number,
  width: number,
  height: number
) {
  const margin = VIEW_MARGIN / scale;
  return {
    left: (0 - stagePos.x) / scale - margin,
    right: (width - stagePos.x) / scale + margin,
    top: (0 - stagePos.y) / scale - margin,
    bottom: (height - stagePos.y) / scale + margin,
  };
}

function chipInRect(chip: Chip, r: { left: number; right: number; top: number; bottom: number }) {
  return (
    chip.x >= r.left - CHIP_RADIUS &&
    chip.x <= r.right + CHIP_RADIUS &&
    chip.y >= r.top - CHIP_RADIUS &&
    chip.y <= r.bottom + CHIP_RADIUS
  );
}

/** Только фишки в видимой области (для отрисовки и хитов) */
function chipsInView(
  chips: Chip[],
  stagePos: { x: number; y: number },
  scale: number,
  width: number,
  height: number
): Chip[] {
  const rect = getVisibleWorldRect(stagePos, scale, width, height);
  return chips.filter((c) => chipInRect(c, rect));
}

function hitChip(worldX: number, worldY: number, chips: Chip[]): Chip | null {
  for (let i = chips.length - 1; i >= 0; i--) {
    const c = chips[i];
    const dx = worldX - c.x;
    const dy = worldY - c.y;
    if (dx * dx + dy * dy <= CHIP_RADIUS * CHIP_RADIUS) return c;
  }
  return null;
}

export default function SessionTablePage() {
  const { id } = useParams<{ id: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [chips, setChips] = useState<Chip[]>([]);

  const [isGrabbing, setIsGrabbing] = useState(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const posStart = useRef<{ x: number; y: number } | null>(null);
  const dragChipId = useRef<string | null>(null);
  const dragChipStart = useRef<{ x: number; y: number } | null>(null);
  const lastWorldRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setStageSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const redraw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const left = (0 - stagePos.x) / scale;
      const right = (width - stagePos.x) / scale;
      const top = (0 - stagePos.y) / scale;
      const bottom = (height - stagePos.y) / scale;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      ctx.save();
      ctx.translate(stagePos.x, stagePos.y);
      ctx.scale(scale, scale);

      // Сетка только в видимой области
      ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
      ctx.lineWidth = 1 / scale;
      const startX = Math.floor(left / GRID_SIZE) * GRID_SIZE;
      const endX = Math.ceil(right / GRID_SIZE) * GRID_SIZE;
      const startY = Math.floor(top / GRID_SIZE) * GRID_SIZE;
      const endY = Math.ceil(bottom / GRID_SIZE) * GRID_SIZE;
      ctx.beginPath();
      for (let x = startX; x <= endX; x += GRID_SIZE) {
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
      }
      for (let y = startY; y <= endY; y += GRID_SIZE) {
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
      }
      ctx.stroke();

      // Отрисовываем только фишки в видимой области (данные всех фишек остаются в state)
      const visibleChips = chipsInView(chips, stagePos, scale, width, height);
      visibleChips.forEach((chip) => {
        ctx.beginPath();
        ctx.arc(chip.x, chip.y, CHIP_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = chip.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 2 / scale;
        ctx.stroke();
      });

      ctx.restore();
    },
    [stagePos, scale, chips]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || stageSize.width <= 0 || stageSize.height <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = stageSize.width;
    canvas.height = stageSize.height;
    redraw(ctx, stageSize.width, stageSize.height);
  }, [stageSize, stagePos, scale, chips, redraw]);

  const addChip = useCallback(() => {
    const centerX = (stageSize.width / 2 - stagePos.x) / scale;
    const centerY = (stageSize.height / 2 - stagePos.y) / scale;
    setChips((prev) => [
      ...prev,
      { id: nextChipId(), x: centerX, y: centerY, color: randomColor() },
    ]);
  }, [stagePos, scale, stageSize.width, stageSize.height]);

  const getCanvasPoint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => e.preventDefault();
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pointerX = ((e.clientX - rect.left) / rect.width) * stageSize.width;
      const pointerY = ((e.clientY - rect.top) / rect.height) * stageSize.height;

      const scaleBy = 1.08;
      const newScale = e.deltaY > 0 ? scale / scaleBy : scale * scaleBy;
      const clampedScale = Math.max(0.1, Math.min(5, newScale));

      setStagePos((pos) => ({
        x: pointerX - (pointerX - pos.x) * (clampedScale / scale),
        y: pointerY - (pointerY - pos.y) * (clampedScale / scale),
      }));
      setScale(clampedScale);
    },
    [scale, stageSize.width, stageSize.height]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pt = getCanvasPoint(e);
      if (!pt) return;
      setIsGrabbing(true);
      const world = screenToWorld(pt.x, pt.y, stagePos, scale);
      const visible = chipsInView(chips, stagePos, scale, stageSize.width, stageSize.height);
      const chip = hitChip(world.x, world.y, visible);
      if (chip) {
        dragChipId.current = chip.id;
        dragChipStart.current = { x: chip.x, y: chip.y };
        lastWorldRef.current = world;
      } else {
        panStart.current = pt;
        posStart.current = { x: stagePos.x, y: stagePos.y };
      }
    },
    [stagePos, scale, chips, stageSize.width, stageSize.height, getCanvasPoint]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pt = getCanvasPoint(e);
      if (!pt) return;

      if (dragChipId.current) {
        const world = screenToWorld(pt.x, pt.y, stagePos, scale);
        const start = dragChipStart.current;
        const last = lastWorldRef.current;
        if (!start || !last) return;
        const dx = world.x - last.x;
        const dy = world.y - last.y;
        const newX = start.x + dx;
        const newY = start.y + dy;
        setChips((prev) =>
          prev.map((c) =>
            c.id === dragChipId.current ? { ...c, x: newX, y: newY } : c
          )
        );
        lastWorldRef.current = world;
        dragChipStart.current = { x: newX, y: newY };
        return;
      }

      if (panStart.current) {
        const dx = pt.x - panStart.current.x;
        const dy = pt.y - panStart.current.y;
        setStagePos({ x: posStart.current!.x + dx, y: posStart.current!.y + dy });
        posStart.current = { x: posStart.current!.x + dx, y: posStart.current!.y + dy };
        panStart.current = pt;
      }
    },
    [stagePos, scale, getCanvasPoint]
  );

  const handleMouseUp = useCallback(() => {
    setIsGrabbing(false);
    panStart.current = null;
    posStart.current = null;
    dragChipId.current = null;
    dragChipStart.current = null;
    lastWorldRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  return (
    <div
      className="fixed inset-0 flex flex-col bg-gray-200 overflow-hidden"
      style={{ height: "100vh", width: "100vw" }}
    >
      <header className="shrink-0 flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Link
            to="/sessions"
            className="text-sm text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
          >
            ← К списку сессий
          </Link>
          <span className="text-gray-600 text-sm">Сессия {id || ""}</span>
        </div>
        <button
          type="button"
          onClick={addChip}
          className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-500"
        >
          + Фишка
        </button>
      </header>

      <div
        ref={containerRef}
        className="flex-1 min-h-0 w-full overflow-hidden"
        style={{ cursor: isGrabbing ? "grabbing" : "grab" }}
      >
        <canvas
          ref={canvasRef}
          width={stageSize.width}
          height={stageSize.height}
          className="block w-full h-full"
          style={{ cursor: isGrabbing ? "grabbing" : "grab", display: "block" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>
    </div>
  );
}
