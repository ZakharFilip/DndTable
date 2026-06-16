import { useEffect } from "react";

interface UseKeyboardShortcutsParams {
  editingKey: string | null;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
}

const isTextInput = (target: EventTarget | null): boolean => {
  const t = target as HTMLElement | null;
  if (!t) return false;
  return (
    t.tagName === "INPUT" ||
    t.tagName === "TEXTAREA" ||
    Boolean((t as HTMLElement & { isContentEditable?: boolean }).isContentEditable)
  );
};

export function useKeyboardShortcuts({
  editingKey,
  onUndo,
  onRedo,
  onDelete,
}: UseKeyboardShortcutsParams) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (editingKey) return;
        if (isTextInput(e.target)) return;
        e.preventDefault();
        onDelete();
        return;
      }

      if (!mod) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (editingKey) return;
        if (isTextInput(e.target)) return;
        e.preventDefault();
        onUndo();
      } else if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) {
        if (editingKey) return;
        if (isTextInput(e.target)) return;
        e.preventDefault();
        onRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingKey, onUndo, onRedo, onDelete]);
}
