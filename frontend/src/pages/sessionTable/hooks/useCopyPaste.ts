import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { TabletopBaseObject } from "@dnd-table/shared";
import {
  nextObjectKey,
  toTabletopImage,
  toTabletopText,
  type TableObjectState,
} from "../../../tabletop/model";
import { CLIP_PREFIX } from "../helpers";

interface UseCopyPasteParams {
  id: string | undefined;
  editingKey: string | null;
  primaryKey: string | null;
  selectedKeys: string[];
  objectsRef: MutableRefObject<TableObjectState[]>;
  stagePosRef: MutableRefObject<{ x: number; y: number }>;
  scaleRef: MutableRefObject<number>;
  stageSizeRef: MutableRefObject<{ width: number; height: number }>;
  setSelectedKey: (k: string | null) => void;
  setSelectedKeys: (ks: string[]) => void;
  createObject: (key: string, obj: TabletopBaseObject) => void;
}

/**
 * Owns clipboard interactions for the table:
 *  - Ctrl+C window listener serializes selected objects to clipboardData.
 *  - Ctrl+V listener tries our serialized format first, then images, then plain text.
 *  - The "drop" handler reuses the same image-from-dataURL path.
 *  - Imperative `copySelection` / `pasteSelection` are exposed for menu items.
 */
export function useCopyPaste(params: UseCopyPasteParams) {
  const {
    id,
    editingKey,
    primaryKey,
    selectedKeys,
    objectsRef,
    stagePosRef,
    scaleRef,
    stageSizeRef,
    setSelectedKey,
    setSelectedKeys,
    createObject,
  } = params;

  const memoryClipboardRef = useRef<string | null>(null);

  const screenCenterWorld = useCallback(() => {
    const sp = stagePosRef.current;
    const sc = scaleRef.current;
    const size = stageSizeRef.current;
    return {
      x: (size.width / 2 - sp.x) / sc,
      y: (size.height / 2 - sp.y) / sc,
    };
  }, [stagePosRef, scaleRef, stageSizeRef]);

  const createImageAtCenter = useCallback(
    (sprite: string) => {
      const { x, y } = screenCenterWorld();
      const key = nextObjectKey("image");
      createObject(key, toTabletopImage({ key, x, y, width: 240, height: 160, sprite }));
    },
    [createObject, screenCenterWorld]
  );

  const createTextAtCenter = useCallback(
    (text: string) => {
      const { x, y } = screenCenterWorld();
      const key = nextObjectKey("text");
      createObject(key, toTabletopText({ key, x, y, width: 260, height: 90, text }));
    },
    [createObject, screenCenterWorld]
  );

  const buildClipboardPayload = useCallback((): string | null => {
    const keys = selectedKeys.length ? selectedKeys : primaryKey ? [primaryKey] : [];
    if (keys.length === 0) return null;
    const objs = keys
      .map((k) => objectsRef.current.find((o) => o.key === k)?.obj)
      .filter(Boolean) as TabletopBaseObject[];
    if (objs.length === 0) return null;
    return CLIP_PREFIX + JSON.stringify({ v: 1, objects: objs });
  }, [selectedKeys, primaryKey, objectsRef]);

  const copySelection = useCallback(async () => {
    if (!id) return;
    const payload = buildClipboardPayload();
    if (!payload) return;
    memoryClipboardRef.current = payload;
    await navigator.clipboard?.writeText(payload).catch(() => {});
  }, [id, buildClipboardPayload]);

  const pasteFromText = useCallback(
    (text: string): boolean => {
      if (!id) return false;
      if (!text.startsWith(CLIP_PREFIX)) return false;
      const raw = text.slice(CLIP_PREFIX.length);
      let parsed: { objects?: unknown; obj?: unknown } | null = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return false;
      }
      const candidate =
        (parsed?.objects as TabletopBaseObject[] | undefined) ??
        (parsed?.obj ? [parsed.obj as TabletopBaseObject] : null);
      if (!candidate || !Array.isArray(candidate) || candidate.length === 0) return false;

      const dx = 20 / Math.max(0.0001, scaleRef.current);
      const dy = 20 / Math.max(0.0001, scaleRef.current);
      const createdKeys: string[] = [];

      for (const src of candidate) {
        if (
          !src ||
          typeof src !== "object" ||
          !(src as TabletopBaseObject).transform ||
          !(src as TabletopBaseObject).type
        ) {
          continue;
        }
        const key = nextObjectKey((src as TabletopBaseObject).type);
        const pos = (src.transform?.position ?? { x: 0, y: 0 }) as { x?: number; y?: number };
        const nextObj: TabletopBaseObject = {
          ...(JSON.parse(JSON.stringify(src)) as TabletopBaseObject),
          id: key,
          groupId: null,
          transform: {
            ...src.transform,
            position: { ...pos, x: (pos.x ?? 0) + dx, y: (pos.y ?? 0) + dy },
          } as TabletopBaseObject["transform"],
        };
        createObject(key, nextObj);
        createdKeys.push(key);
      }

      if (createdKeys.length > 0) {
        setSelectedKey(createdKeys[0]);
        setSelectedKeys(createdKeys);
      }
      return createdKeys.length > 0;
    },
    [id, scaleRef, createObject, setSelectedKey, setSelectedKeys]
  );

  const pasteSelection = useCallback(async () => {
    const sys = await navigator.clipboard?.readText().catch(() => "");
    const mem = memoryClipboardRef.current ?? "";
    const text = sys && sys.startsWith(CLIP_PREFIX) ? sys : mem;
    if (!text) return;
    pasteFromText(text);
  }, [pasteFromText]);

  // window 'copy' — write our payload to clipboardData
  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      if (!id) return;
      if (editingKey) return;
      const t = e.target as HTMLElement | null;
      const isTextField =
        t?.tagName === "INPUT" ||
        t?.tagName === "TEXTAREA" ||
        Boolean((t as HTMLElement & { isContentEditable?: boolean })?.isContentEditable);
      if (isTextField) return;

      const payload = buildClipboardPayload();
      if (!payload) return;
      memoryClipboardRef.current = payload;
      try {
        e.clipboardData?.setData("text/plain", payload);
        e.preventDefault();
      } catch {
        // ignore
      }
    };
    window.addEventListener("copy", onCopy);
    return () => window.removeEventListener("copy", onCopy);
  }, [id, editingKey, buildClipboardPayload]);

  // window 'paste' — try our format, then images, then plain text
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!id) return;
      const plain = e.clipboardData?.getData("text/plain") ?? "";
      if (plain.startsWith(CLIP_PREFIX)) {
        const ok = pasteFromText(plain);
        if (ok) e.preventDefault();
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = () => {
            const sprite = typeof reader.result === "string" ? reader.result : "";
            if (sprite) createImageAtCenter(sprite);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          return;
        }
      }

      const text = e.clipboardData?.getData("text/plain");
      if (text && text.trim()) {
        createTextAtCenter(text);
        e.preventDefault();
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [id, pasteFromText, createImageAtCenter, createTextAtCenter]);

  return {
    copySelection,
    pasteSelection,
    pasteFromText,
    createImageAtCenter,
  };
}
