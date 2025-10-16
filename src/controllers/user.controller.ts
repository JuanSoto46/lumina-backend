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
