/* This TypeScript code snippet is setting up routes and functions to interact with the Pexels API for
fetching popular videos, searching videos based on query and terms, getting a video by ID, and
performing a health check on the API endpoints. */
import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";
import bcrypt from "bcryptjs";

export async function me(req: AuthRequest, res: Response) {
  const user = await User.findById(req.userId).select("-passwordHash");
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json(user);
}

export async function updateMe(req: AuthRequest, res: Response) {
  const { firstName, lastName, age, email, password } = req.body;
  const updates: any = { firstName, lastName, age, email };
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);
  const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select("-passwordHash");
  return res.json(user);
}

export async function deleteMe(req: AuthRequest, res: Response) {
  await User.findByIdAndDelete(req.userId);
  return res.json({ message: "Account deleted" });
}

export async function changePassword(req: any, res: Response) {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "Missing fields" });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(400).json({ message: "Current password incorrect" });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  return res.json({ message: "Password changed" });
}