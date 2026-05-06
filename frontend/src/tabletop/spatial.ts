import type { TableObjectState } from "./model";
import type { WorldRect } from "./geometry";
import { getObjectAabb, objectInRect } from "./geometry";

function cellKey(cx: number, cy: number) {
  return `${cx},${cy}`;
}

export class SpatialIndex {
  private map: Map<string, number[]> = new Map();
  private objects: TableObjectState[];
  private cellSize: number;

  constructor(objects: TableObjectState[], cellSize: number) {
    this.objects = objects;
    this.cellSize = cellSize;
    for (let i = 0; i < this.objects.length; i++) {
      this.add(i, getObjectAabb(this.objects[i]));
    }
  }

  private add(idx: number, r: WorldRect) {
    const minX = Math.floor(r.left / this.cellSize);
    const maxX = Math.floor(r.right / this.cellSize);
    const minY = Math.floor(r.top / this.cellSize);
    const maxY = Math.floor(r.bottom / this.cellSize);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const k = cellKey(cx, cy);
        const list = this.map.get(k);
        if (list) list.push(idx);
        else this.map.set(k, [idx]);
      }
    }
  }

  query(r: WorldRect): TableObjectState[] {
    const minX = Math.floor(r.left / this.cellSize);
    const maxX = Math.floor(r.right / this.cellSize);
    const minY = Math.floor(r.top / this.cellSize);
    const maxY = Math.floor(r.bottom / this.cellSize);
    const seen = new Set<number>();
    const out: TableObjectState[] = [];
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const list = this.map.get(cellKey(cx, cy));
        if (!list) continue;
        for (const idx of list) {
          if (seen.has(idx)) continue;
          seen.add(idx);
          const o = this.objects[idx];
          if (objectInRect(o, r)) out.push(o);
        }
      }
    }
    return out;
  }
}

