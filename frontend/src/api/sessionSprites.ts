import http from "./http";
import { dataUrlToCompressedBlob } from "../utils/compressImage";

export async function uploadSessionSprite(sessionId: string, file: Blob): Promise<string> {
  const form = new FormData();
  form.append("sprite", file, "sprite.jpg");
  const resp = await http.post(`/api/sessions/${sessionId}/sprites`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const sprite = resp.data?.data?.sprite;
  if (typeof sprite !== "string" || !sprite) {
    throw new Error("Invalid upload response");
  }
  return sprite;
}

/** Upload data URLs to the server; pass through existing HTTP paths unchanged. */
export async function prepareSpriteForSync(sessionId: string, sprite: string): Promise<string> {
  if (!sprite.startsWith("data:")) return sprite;
  const blob = await dataUrlToCompressedBlob(sprite);
  return uploadSessionSprite(sessionId, blob);
}
