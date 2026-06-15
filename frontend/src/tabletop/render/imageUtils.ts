/** True when the image finished loading and has drawable pixels. */
export function isDrawableImage(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
}

/** drawImage throws DOMException for broken images in some browsers. */
export function safeDrawImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  ...args: [number, number, number, number]
): void {
  if (!isDrawableImage(img)) return;
  try {
    ctx.drawImage(img, ...args);
  } catch {
    // broken / cross-origin — skip sprite
  }
}
