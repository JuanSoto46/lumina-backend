/* This TypeScript code snippet is defining a middleware function for Express.js that enforces
authentication using JSON Web Tokens (JWT). Here's a breakdown of what each part does: */
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: "Missing Authorization header" });
    const token = header.replace("Bearer ", "");
    const secret = process.env.JWT_SECRET || "dev";
    const payload = jwt.verify(token, secret) as { id: string };
    req.userId = payload.id;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
