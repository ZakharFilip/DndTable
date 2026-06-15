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

export function spriteUploadErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const data = (err as { response?: { data?: { message?: string } } }).response?.data;
    if (typeof data?.message === "string" && data.message.trim()) return data.message;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return "Не удалось загрузить изображение";
}
