// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendMail } from "../utils/mail.js";
import { validatePasswordStrength } from "../utils/validatePassword.js"; 

/**
 * Registers a new user in the database.
 * 
 * Validates required fields, ensures the user is 18 or older,
 * checks password strength, hashes the password, and saves the user.
 *
 * @async
 * @function signUp
 * @param {Request} req - Express request object containing user data.
 * @param {Response} res - Express response object.
 * @returns {Promise<Response>} JSON response with created user info or error message.
 */
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

/**
 * Authenticates a user and returns a JWT token.
 *
 * Checks email and password, verifies credentials using bcrypt,
 * and signs a JWT with the user ID.
 *
 * @async
 * @function login
 * @param {Request} req - Express request object containing credentials.
 * @param {Response} res - Express response object.
 * @returns {Promise<Response>} JSON response with JWT token or error message.
 */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "dev", { expiresIn: "7d" });
  return res.json({ token });
}

/**
 * Initiates the password reset process by sending an email with a reset link.
 *
 * Generates a secure token, hashes it, stores it with expiration in the user document,
 * and sends a password reset email to the user. Returns a neutral response
 * to avoid disclosing whether the email exists.
 *
 * @async
 * @function forgotPassword
 * @param {Request} req - Express request object containing user's email.
 * @param {Response} res - Express response object.
 * @returns {Promise<Response>} JSON response indicating email was sent (neutral).
 *
 */
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

/**
 * Resets the user's password using a valid reset token.
 *
 * Validates the provided token and new password, verifies expiration,
 * hashes the new password, and clears reset fields.
 *
 * @async
 * @function resetPassword
 * @param {Request} req - Express request object containing token and new passwords.
 * @param {Response} res - Express response object.
 * @returns {Promise<Response>} JSON response indicating success or failure.
 */
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


