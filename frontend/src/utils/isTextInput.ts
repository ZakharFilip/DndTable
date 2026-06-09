/** True when the event target is a text field (skip canvas shortcuts / paste). */
export function isTextInput(target: EventTarget | null): boolean {
  const t = target as HTMLElement | null;
  if (!t) return false;
  return (
    t.tagName === "INPUT" ||
    t.tagName === "TEXTAREA" ||
    t.tagName === "SELECT" ||
    Boolean((t as HTMLElement & { isContentEditable?: boolean })?.isContentEditable)
  );
}
