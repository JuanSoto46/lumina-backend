import { Request, Response } from "express";
import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendMail } from "../utils/mail.js";

export async function signUp(req: Request, res: Response) {
  const { firstName, lastName, age, email, password } = req.body;
  if (!firstName || !lastName || !age || !email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: "Email already registered" });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ firstName, lastName, age, email, passwordHash });
  return res.status(201).json({ id: user.id, email: user.email });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "dev", { expiresIn: "7d" });
  return res.json({ token });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(200).json({ message: "If the email exists, a reset was sent" });
  const token = crypto.randomBytes(32).toString("hex");
  const exp = new Date(Date.now() + 1000 * 60 * 30);
  user.resetToken = token;
  user.resetTokenExp = exp;
  await user.save();
  const link = `${process.env.CLIENT_URL}/reset?token=${token}&email=${encodeURIComponent(email)}`;
  await sendMail(email, "Reset your password", `<p>Reset link valid 30 minutes:</p><p><a href="${link}">${link}</a></p>`);
  return res.json({ message: "If the email exists, a reset was sent" });
}

export async function resetPassword(req: Request, res: Response) {
  const { email, token, newPassword } = req.body;
  const user = await User.findOne({ email, resetToken: token, resetTokenExp: { $gt: new Date() } });
  if (!user) return res.status(400).json({ message: "Invalid or expired token" });
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetToken = undefined;
  user.resetTokenExp = undefined;
  await user.save();
  return res.json({ message: "Password updated" });
}
