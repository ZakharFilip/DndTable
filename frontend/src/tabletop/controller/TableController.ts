export type StagePos = { x: number; y: number };
export type StageSize = { width: number; height: number };

export type WheelInput = {
  deltaY: number;
  pointer: { x: number; y: number }; // screen-space in canvas pixels
};

export class TableController {
  private minScale: number;
  private maxScale: number;
  private wheelScaleBy: number;

  constructor(opts?: { minScale?: number; maxScale?: number; wheelScaleBy?: number }) {
    this.minScale = opts?.minScale ?? 0.1;
    this.maxScale = opts?.maxScale ?? 5;
    this.wheelScaleBy = opts?.wheelScaleBy ?? 1.08;
  }

  wheelZoom(params: { input: WheelInput; stagePos: StagePos; scale: number }): { stagePos: StagePos; scale: number } {
    const { input, stagePos, scale } = params;
    const newScale = input.deltaY > 0 ? scale / this.wheelScaleBy : scale * this.wheelScaleBy;
    const clampedScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));

    const nextStagePos = {
      x: input.pointer.x - (input.pointer.x - stagePos.x) * (clampedScale / scale),
      y: input.pointer.y - (input.pointer.y - stagePos.y) * (clampedScale / scale),
    };

    return { stagePos: nextStagePos, scale: clampedScale };
  }

  private panActive: boolean = false;
  private panStart: { x: number; y: number } | null = null;
  private panBaseStagePos: StagePos | null = null;

  startPan(params: { pointer: { x: number; y: number }; stagePos: StagePos }) {
    this.panActive = true;
    this.panStart = params.pointer;
    this.panBaseStagePos = params.stagePos;
  }

  movePan(params: { pointer: { x: number; y: number } }): StagePos | null {
    if (!this.panActive || !this.panStart || !this.panBaseStagePos) return null;
    const dx = params.pointer.x - this.panStart.x;
    const dy = params.pointer.y - this.panStart.y;
    return { x: this.panBaseStagePos.x + dx, y: this.panBaseStagePos.y + dy };
  }

  endPan() {
    this.panActive = false;
    this.panStart = null;
    this.panBaseStagePos = null;
  }

  private dragActive: boolean = false;
  private dragStartWorld: { x: number; y: number } | null = null;
  private dragKeys: string[] = [];
  private dragBasePos: Map<string, { x: number; y: number }> = new Map();

  startDrag(params: { keys: string[]; startWorld: { x: number; y: number }; objects: Array<{ key: string; x: number; y: number }> }) {
    this.dragActive = true;
    this.dragStartWorld = params.startWorld;
    this.dragKeys = [...new Set(params.keys)];
    this.dragBasePos = new Map();
    const index = new Map(params.objects.map((o) => [o.key, o]));
    for (const k of this.dragKeys) {
      const o = index.get(k);
      if (o) this.dragBasePos.set(k, { x: o.x, y: o.y });
    }
  }

  moveDrag(params: { world: { x: number; y: number } }): { keys: string[]; delta: { dx: number; dy: number } } | null {
    if (!this.dragActive || !this.dragStartWorld) return null;
    const dx = params.world.x - this.dragStartWorld.x;
    const dy = params.world.y - this.dragStartWorld.y;
    return { keys: this.dragKeys, delta: { dx, dy } };
  }

  applyDragToObjects<T extends { key: string; obj: { transform: { position: { x: number; y: number } } } }>(
    objects: T[],
    move: { keys: string[]; delta: { dx: number; dy: number } }
  ): T[] {
    const keysSet = new Set(move.keys);
    const { dx, dy } = move.delta;
    return objects.map((o) => {
      if (!keysSet.has(o.key)) return o;
      const base = this.dragBasePos.get(o.key);
      if (!base) return o;
      return {
        ...o,
        obj: {
          ...o.obj,
          transform: {
            ...o.obj.transform,
            position: {
              ...o.obj.transform.position,
              x: base.x + dx,
              y: base.y + dy,
            },
          },
        },
      };
    });
  }

  endDrag(): string[] {
    const keys = this.dragKeys;
    this.dragActive = false;
    this.dragStartWorld = null;
    this.dragKeys = [];
    this.dragBasePos = new Map();
    return keys;
  }

  private transform:
    | null
    | {
        kind: "rotate";
        key: string;
        startRotation: number;
        cx: number;
        cy: number;
        startAngle: number;
      }
    | {
        kind: "resize";
        key: string;
        handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
        start: { x: number; y: number; width: number; height: number; rotation: number };
        startPointer: { x: number; y: number };
      } = null;

  startRotate(params: {
    key: string;
    obj: { transform: { position: { x: number; y: number }; rotation?: number }; metadata?: any };
    world: { x: number; y: number };
  }) {
    const meta: any = params.obj.metadata ?? {};
    const x = params.obj.transform.position.x;
    const y = params.obj.transform.position.y;
    const w = typeof meta.width === "number" ? meta.width : 120;
    const h = typeof meta.height === "number" ? meta.height : 80;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const startRotation = params.obj.transform.rotation ?? 0;
    const startAngle = Math.atan2(params.world.y - cy, params.world.x - cx);
    this.transform = { kind: "rotate", key: params.key, startRotation, cx, cy, startAngle };
  }

  startResize(params: {
    key: string;
    obj: { transform: { position: { x: number; y: number }; rotation?: number }; metadata?: any };
    handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
    world: { x: number; y: number };
  }) {
    const meta: any = params.obj.metadata ?? {};
    const x = params.obj.transform.position.x;
    const y = params.obj.transform.position.y;
    const w = typeof meta.width === "number" ? meta.width : 120;
    const h = typeof meta.height === "number" ? meta.height : 80;
    const rotation = params.obj.transform.rotation ?? 0;
    this.transform = {
      kind: "resize",
      key: params.key,
      handle: params.handle,
      start: { x, y, width: w, height: h, rotation },
      startPointer: params.world,
    };
  }

  moveTransform<T extends { key: string; obj: any }>(params: { world: { x: number; y: number }; objects: T[] }): T[] | null {
    const mode = this.transform;
    if (!mode) return null;

    if (mode.kind === "rotate") {
      const a = Math.atan2(params.world.y - mode.cy, params.world.x - mode.cx);
      const deltaDeg = ((a - mode.startAngle) * 180) / Math.PI;
      const nextRot = mode.startRotation + deltaDeg;
      return params.objects.map((o) =>
        o.key === mode.key ? { ...o, obj: { ...o.obj, transform: { ...o.obj.transform, rotation: nextRot } } } : o
      );
    }

    if (mode.kind === "resize") {
      if (mode.start.rotation) return params.objects; // MVP: resize only unrotated
      const minSize = 4;
      let left = mode.start.x;
      let top = mode.start.y;
      let right = mode.start.x + mode.start.width;
      let bottom = mode.start.y + mode.start.height;
      const dx = params.world.x - mode.startPointer.x;
      const dy = params.world.y - mode.startPointer.y;

      if (mode.handle.includes("e")) right = right + dx;
      if (mode.handle.includes("w")) left = left + dx;
      if (mode.handle.includes("s")) bottom = bottom + dy;
      if (mode.handle.includes("n")) top = top + dy;

      const width = Math.max(minSize, right - left);
      const height = Math.max(minSize, bottom - top);
      if (right - left < minSize) {
        if (mode.handle.includes("w")) left = right - width;
        else right = left + width;
      }
      if (bottom - top < minSize) {
        if (mode.handle.includes("n")) top = bottom - height;
        else bottom = top + height;
      }

      return params.objects.map((o) => {
        if (o.key !== mode.key) return o;
        const meta: any = o.obj.metadata ?? {};
        return {
          ...o,
          obj: {
            ...o.obj,
            transform: { ...o.obj.transform, position: { ...o.obj.transform.position, x: left, y: top } },
            metadata: { ...meta, width: width, height: height, kind: meta.kind ?? "shape" },
          },
        };
      });
    }

    return params.objects;
  }

  endTransform(): string | null {
    const key = this.transform ? this.transform.key : null;
    this.transform = null;
    return key;
  }

  computeSelection(params: {
    hit: null | { key: string; groupId: string | null };
    shiftKey: boolean;
    objects: Array<{ key: string; groupId: string | null }>;
  }): { selectedKey: string | null; selectedKeys: string[] } {
    if (!params.hit) return { selectedKey: null, selectedKeys: [] };

    const { key, groupId } = params.hit;

    if (groupId) {
      const groupKeys = params.objects.filter((o) => o.groupId === groupId).map((o) => o.key);
      return { selectedKey: key, selectedKeys: groupKeys };
    }

    if (params.shiftKey) {
      // Note: shift behavior depends on previous selection; caller should merge.
      return { selectedKey: key, selectedKeys: [key] };
    }

    return { selectedKey: key, selectedKeys: [key] };
  }
}

