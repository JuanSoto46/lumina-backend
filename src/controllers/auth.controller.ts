// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendMail } from "../utils/mail.js";
import { validatePasswordStrength } from "../utils/validatePassword.js"; 


export async function signUp(req: Request, res: Response) {
  const { firstName, lastName, age, email, password } = req.body;
  if (!firstName || !lastName || !age || !email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  if (age < 18) {
    return res.status(400).json({ message: "You must be at least 18 years old to register." });
  }

  // ✅ Nueva validación de fuerza de contraseña
  const err = validatePasswordStrength(password);
  if (err) return res.status(400).json({ message: err });

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
  if (!email) return res.status(400).json({ message: "Email required" });

  const user = await User.findOne({ email });
  // Respuesta neutra para no filtrar usuarios
  if (!user) return res.json({ message: "If the email exists, a reset was sent" });

  // Genera token y guarda SOLO el hash + expiración
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const exp = new Date(Date.now() + 60 * 60 * 1000);

  user.passwordResetTokenHash = tokenHash;
  user.passwordResetTokenExp = exp;

  // Limpia campos legacy si existieran
  user.resetToken = undefined;
  user.resetTokenExp = undefined;

  await user.save();

  const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0];
  const resetUrl = `${clientUrl}/reset?token=${token}`;

  const html = `
    <div style="font-family:Arial,sans-serif">
      <h2>Restablecer tu contraseña</h2>
      <p>Vence en <b>60 minutos</b>.</p>
      <p><a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Restablecer contraseña</a></p>
      <p>Si no funciona el botón, copia este enlace:<br>${resetUrl}</p>
    </div>
  `;

  try {
    await sendMail({ to: email, subject: "Restablece tu contraseña", html });
  } catch (e: any) {
    return res.status(502).json({ message: "Email service error", detail: e.message });
  }

  return res.json({ message: "If the email exists, a reset was sent" });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password, confirmPassword } = req.body;

  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ message: "Missing fields" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  // ✅ Validación centralizada
  const err = validatePasswordStrength(password);
  if (err) return res.status(400).json({ message: err });

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetTokenExp: { $gt: new Date() },
  });

  if (!user) return res.status(400).json({ message: "Invalid or expired token" });

  user.passwordHash = await bcrypt.hash(password, 10);
  user.passwordResetTokenHash = undefined;
  user.passwordResetTokenExp = undefined;

  user.resetToken = undefined;
  user.resetTokenExp = undefined;

  await user.save();

  return res.json({ message: "Password updated" });
}


