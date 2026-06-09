import { Router, type NextFunction, type Request, type Response } from "express";
import { requireAuth } from "../../shared/requireAuth.js";
import { UserSearchService } from "./UserSearchService.js";
import { UserModel } from "./user.model.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/search",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const q = typeof req.query.q === "string" ? req.query.q : "";
      const users = await UserSearchService.search(q, userId);
      return res.json({ success: true, data: { users } });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId;
    const user = await UserModel.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, error: "NOT_FOUND" });
    }
    return res.json({
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          friendCode: user.friendCode,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
