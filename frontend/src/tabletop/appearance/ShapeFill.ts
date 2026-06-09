export const TRANSPARENT_FILL = "rgba(0,0,0,0)";

/** True when fill should not be drawn (fully transparent). */
export function isTransparentFill(color: string | undefined | null): boolean {
  if (!color) return true;
  if (color === TRANSPARENT_FILL || color === "transparent") return true;

  const rgba = color.match(
    /^rgba\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i
  );
  if (rgba) return parseFloat(rgba[4]) <= 0;

  return false;
}

/** Parse alpha from rgba() or 1 for hex/rgb. */
export function parseFillAlpha(color: string | undefined | null): number {
  if (!color || isTransparentFill(color)) return 0;
  const rgba = color.match(
    /^rgba\s*\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/i
  );
  if (rgba) return parseFloat(rgba[1]);
  return 1;
}
