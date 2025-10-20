/**
 * Controller: User Account Management
 * -----------------------------------
 * This module defines user-related endpoints for authenticated operations,
 * including profile retrieval, updates, account deletion, and password changes.
 * 
 * It ensures secure password handling with bcrypt hashing and centralized
 * password strength validation.
 */

import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import { validatePasswordStrength } from "../utils/validatePassword.js";

/**
 * @function me
 * @description Returns the authenticated user's profile (excluding password hash).
 * @route GET /users/me
 * @access Private
 * 
 * @param {AuthRequest} req - Express request containing `userId` from the auth middleware.
 * @param {Response} res - Express response.
 * @returns {Promise<Response>} JSON response with user data or 404 if not found.
 */
export async function me(req: AuthRequest, res: Response) {
  const user = await User.findById(req.userId).select("-passwordHash");
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json(user);
}

/**
 * @function updateMe
 * @description Updates the authenticated user's profile data.
 * Supports optional password update with automatic hashing.
 * @route PUT /users/me
 * @access Private
 * 
 * @param {AuthRequest} req - Authenticated request with userId and body containing updated fields.
 * @param {Response} res - Express response.
 * @returns {Promise<Response>} JSON with the updated user object.
 */
export async function updateMe(req: AuthRequest, res: Response) {
  const { firstName, lastName, age, email, password } = req.body;
  const updates: any = { firstName, lastName, age, email };

  // If user wants to change password, hash it before saving
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);

  const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select("-passwordHash");
  return res.json(user);
}

/**
 * @function deleteMe
 * @description Deletes the authenticated user's account permanently.
 * @route DELETE /users/me
 * @access Private
 * 
 * @param {AuthRequest} req - Authenticated request containing userId.
 * @param {Response} res - Express response.
 * @returns {Promise<Response>} JSON confirmation message.
 */
export async function deleteMe(req: AuthRequest, res: Response) {
  await User.findByIdAndDelete(req.userId);
  return res.json({ message: "Account deleted" });
}

/**
 * @function changePassword
 * @description Allows authenticated users to change their password securely.
 * Validates current password, compares confirmation, and enforces strength rules.
 * @route POST /users/change-password
 * @access Private
 * 
 * @param {AuthRequest} req - Authenticated request with `currentPassword`, `newPassword`, and `confirmPassword`.
 * @param {Response} res - Express response.
 * @returns {Promise<Response>} JSON message indicating success or error.
 * 
 * @throws {400} If required fields are missing, passwords don't match, or current password is invalid.
 * @throws {404} If the user is not found.
 */
export async function changePassword(req: AuthRequest, res: Response) {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Basic field validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "Missing fields" });
  }

  // Check new password confirmation
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  // Validate password strength
  const err = validatePasswordStrength(newPassword);
  if (err) return res.status(400).json({ message: err });

  // Find user and validate current password
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(400).json({ message: "Current password incorrect" });

  // Save new password securely
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  return res.json({ message: "Password changed" });
}
