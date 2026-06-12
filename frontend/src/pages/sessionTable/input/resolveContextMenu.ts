import type { TableObjectState } from "../../../tabletop/model";

export type ContextMenuResolution = {
  menuKeys: string[];
  selectKey: string | null;
  selectKeys: string[] | null;
  preventDefault: boolean;
};

export function currentSelectionKeys(
  selectedKeys: string[],
  selectedKey: string | null
): string[] {
  if (selectedKeys.length > 0) return selectedKeys;
  if (selectedKey) return [selectedKey];
  return [];
}

/** Desktop right-click semantics (unchanged). */
export function resolveDesktopContextMenu(params: {
  hit: TableObjectState | null;
  selectedKeys: string[];
  selectedKey: string | null;
}): ContextMenuResolution {
  const { hit, selectedKeys, selectedKey } = params;
  const currentKeys = currentSelectionKeys(selectedKeys, selectedKey);

  if (hit) {
    const inMulti = selectedKeys.length > 1 && selectedKeys.includes(hit.key);
    if (inMulti) {
      return {
        menuKeys: selectedKeys,
        selectKey: hit.key,
        selectKeys: null,
        preventDefault: true,
      };
    }
    return {
      menuKeys: [hit.key],
      selectKey: hit.key,
      selectKeys: [hit.key],
      preventDefault: true,
    };
  }

  if (currentKeys.length > 0) {
    return {
      menuKeys: currentKeys,
      selectKey: null,
      selectKeys: null,
      preventDefault: true,
    };
  }

  return {
    menuKeys: [],
    selectKey: null,
    selectKeys: null,
    preventDefault: true,
  };
}

export type LongPressMenuResult =
  | { action: "selectOnly"; selectKey: string; selectKeys: string[] }
  | { action: "openMenu"; menuKeys: string[]; selectKey: string | null; selectKeys: string[] | null }
  | { action: "none" };

/** Mobile long-press release (no drag) semantics. */
export function resolveLongPressMenu(params: {
  hit: TableObjectState | null;
  selectedKeys: string[];
  selectedKey: string | null;
}): LongPressMenuResult {
  const { hit, selectedKeys, selectedKey } = params;
  const currentKeys = currentSelectionKeys(selectedKeys, selectedKey);

  if (hit && !currentKeys.includes(hit.key)) {
    return {
      action: "selectOnly",
      selectKey: hit.key,
      selectKeys: [hit.key],
    };
  }

  if (currentKeys.length > 0) {
    if (hit) {
      const inMulti = selectedKeys.length > 1 && selectedKeys.includes(hit.key);
      return {
        action: "openMenu",
        menuKeys: inMulti ? selectedKeys : currentKeys,
        selectKey: hit.key,
        selectKeys: inMulti ? null : null,
      };
    }
    return {
      action: "openMenu",
      menuKeys: currentKeys,
      selectKey: null,
      selectKeys: null,
    };
  }

  return { action: "none" };
}
