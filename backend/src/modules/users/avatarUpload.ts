import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const AVATARS_DIR = path.join(backendRoot, "uploads", "avatars");

fs.mkdirSync(AVATARS_DIR, { recursive: true });

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
  filename: (req, file, cb) => {
    const userId = (req as { userId?: string }).userId ?? "user";
    const ext =
      file.mimetype === "image/png"
        ? ".png"
        : file.mimetype === "image/webp"
          ? ".webp"
          : ".jpg";
    cb(null, `${userId}-${Date.now()}${ext}`);
  },
});

export const avatarUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error("INVALID_FILE_TYPE"));
      return;
    }
    cb(null, true);
  },
});

export function deleteAvatarFile(filename?: string | null) {
  if (!filename || filename === "default-avatar.png") return;
  const filePath = path.join(AVATARS_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
