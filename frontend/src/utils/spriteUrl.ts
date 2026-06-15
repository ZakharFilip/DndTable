import { resolveApiBase } from "../config/apiOrigin";

/** Resolve sprite path or data URL for canvas Image.src */
export function resolveSpriteSrc(sprite: string): string {
  if (!sprite) return sprite;
  if (sprite.startsWith("data:") || sprite.startsWith("http://") || sprite.startsWith("https://")) {
    return sprite;
  }
  const base = resolveApiBase();
  if (sprite.startsWith("/")) {
    return base ? `${base}${sprite}` : sprite;
  }
  return sprite;
}
