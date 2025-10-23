/**
 * @fileoverview Authentication controller for user registration, login, and password reset functionality.
 * @module controllers/auth.controller
 * @version 1.0.0
 */

import { Request, Response } from "express";
import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendMail } from "../utils/mail.js";

/**
 * Registers a new user in the system.
 * 
 * @async
 * @function signUp
 * @param {Request} req - Express request object containing user registration data
 * @param {string} req.body.firstName - User's first name
 * @param {string} req.body.lastName - User's last name
 * @param {number} req.body.age - User's age
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's plain text password (will be hashed)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with user ID and email on success, or error message
 * @throws {400} Missing required fields
 * @throws {409} Email already registered
 * @throws {201} User created successfully
 */
export async function signUp(req: Request, res: Response) {
  const { firstName, lastName, age, email, password } = req.body;
  if (!firstName || !lastName || !age || !email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  if (age < 18) {
    return res.status(400).json({ message: "You must be at least 18 years old to register." });
  }


  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ firstName, lastName, age, email, passwordHash });
  return res.status(201).json({ id: user.id, email: user.email });
}

/**
 * Authenticates a user and returns a JWT token.
 * 
 * @async
 * @function login
 * @param {Request} req - Express request object containing login credentials
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's plain text password
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with JWT token on success, or error message
 * @throws {401} Invalid credentials (email not found or password incorrect)
 * @throws {200} Login successful with JWT token
 * 
 * @example
 * // POST /auth/login
 * // Body: { email: "john@example.com", password: "password123" }
 * // Response: { token: "jwt_token_string" }
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
 * Initiates password reset process by generating a secure token and sending reset email.
 * 
 * @async
 * @function forgotPassword
 * @param {Request} req - Express request object containing email
 * @param {string} req.body.email - User's email address for password reset
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Neutral success message (doesn't reveal if email exists)
 * @throws {400} Email required
 * @throws {502} Email service error
 * @throws {200} Reset email sent (if email exists in database)
 * 
 * @description
 * - Generates a cryptographically secure random token
 * - Stores only the SHA256 hash of the token in database
 * - Token expires in 60 minutes
 * - Sends HTML email with reset link
 * - Returns neutral response to prevent email enumeration
 * 
 */
export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  const user = await User.findOne({ email });
  if (!user) return res.json({ message: "If the email exists, a reset was sent" });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const exp = new Date(Date.now() + 60 * 60 * 1000);

  user.passwordResetTokenHash = tokenHash;
  user.passwordResetTokenExp = exp;

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
 * Completes password reset process using a valid reset token.
 * 
 * @async
 * @function resetPassword
 * @param {Request} req - Express request object containing reset data
 * @param {string} req.body.token - Password reset token (raw token, not hashed)
 * @param {string} req.body.password - New password
 * @param {string} req.body.confirmPassword - Password confirmation (must match password)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Success message on password update, or error message
 * @throws {400} Missing required fields or passwords don't match
 * @throws {400} Invalid or expired token
 * @throws {200} Password updated successfully
 * 
 * @description
 * - Validates that all required fields are present
 * - Ensures password and confirmPassword match
 * - Hashes the token and looks for matching user with valid expiration
 * - Updates user password with bcrypt hash
 * - Cleans up reset token fields from user document
 * - Removes any legacy token fields for security
 * 
 * @example
 * // POST /auth/reset-password
 * // Body: { token: "reset_token", password: "newpassword123", confirmPassword: "newpassword123" }
 * // Response: { message: "Password updated" }
 */
export async function resetPassword(req: Request, res: Response) {
  const { token, password, confirmPassword } = req.body;

  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ message: "Missing fields" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }


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


