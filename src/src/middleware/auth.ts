/**
 * @fileoverview Express middleware for enforcing authentication using JSON Web Tokens (JWT).
 * Validates the presence and integrity of a JWT from the `Authorization` header.
 * 
 * If the token is valid, the decoded user ID is attached to the request object.
 * Otherwise, the middleware returns a `401 Unauthorized` response.
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/**
 * Extends the default Express `Request` object to include the authenticated user ID.
 * 
 * @interface AuthRequest
 * @extends {Request}
 * @property {string} [userId] - The ID of the authenticated user extracted from the JWT.
 */
export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Middleware that requires a valid JWT for protected routes.
 * 
 * @function requireAuth
 * @param {AuthRequest} req - Express request object, optionally extended with a `userId` field.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next function to pass control to the next middleware.
 * @returns {Response | void} Sends a 401 response if the token is missing or invalid, otherwise calls `next()`.
 * 
 * @throws {Error} When JWT verification fails.
 */
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
