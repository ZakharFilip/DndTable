import fs from "fs";
import path from "path";
import multer from "multer";

/** PM2 cwd is `backend/` (see ecosystem.config.cjs) — same layout as avatar uploads. */
const backendRoot = path.resolve(process.cwd());
export const SESSION_SPRITES_DIR = path.join(backendRoot, "uploads", "session-sprites");

fs.mkdirSync(SESSION_SPRITES_DIR, { recursive: true });

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function sessionSpritesDir(sessionId: string) {
  const dir = path.join(SESSION_SPRITES_DIR, sessionId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function createSessionSpriteUpload(sessionId: string) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, sessionSpritesDir(sessionId)),
      filename: (_req, file, cb) => {
        const ext =
          file.mimetype === "image/png"
            ? ".png"
            : file.mimetype === "image/webp"
              ? ".webp"
              : ".jpg";
        cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
      },
    }),
    limits: { fileSize: 4 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME.has(file.mimetype)) {
        cb(new Error("INVALID_FILE_TYPE"));
        return;
      }
      cb(null, true);
    },
  });
}

export function sessionSpritePublicPath(sessionId: string, filename: string) {
  return `/session-sprites/${sessionId}/${filename}`;
}
