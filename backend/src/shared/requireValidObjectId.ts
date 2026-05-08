import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

export function requireValidObjectId(paramName: string = "id") {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({
        success: false,
        error: "BAD_REQUEST",
        message: `Некорректный ${paramName}`,
      });
    }
    return next();
  };
}
