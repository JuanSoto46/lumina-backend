/**
 * @fileoverview User profile management controller for authenticated user operations.
 * Provides endpoints for viewing, updating, and managing user accounts including password changes.
 * @module controllers/user.controller
 * @version 1.0.0
 * @requires express
 * @requires bcryptjs
 * @requires ../middleware/auth
 * @requires ../models/User
 */

import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import { validatePasswordStrength } from "../utils/validatePassword.js";

/**
 * Retrieves the authenticated user's profile information.
 * 
 * @async
 * @function me
 * @param {AuthRequest} req - Express request object with authenticated user ID
 * @param {string} req.userId - ID of the authenticated user (from auth middleware)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} User profile data (excluding password hash) or error message
 * @throws {404} User not found
 * @throws {200} User profile retrieved successfully
 * 
 * @description
 * Fetches the current user's profile information based on the user ID from the JWT token.
 * The password hash is excluded from the response for security purposes.
 * Requires authentication middleware to populate req.userId.
 * 
 * @example
 * // GET /users/me
 * // Headers: { Authorization: "Bearer <jwt_token>" }
 * // Response: { _id: "...", firstName: "John", lastName: "Doe", email: "john@example.com", age: 25 }
 */
export async function me(req: AuthRequest, res: Response) {
  const user = await User.findById(req.userId).select("-passwordHash");
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json(user);
}

/**
 * Updates the authenticated user's profile information.
 * 
 * @async
 * @function updateMe
 * @param {AuthRequest} req - Express request object with user data and authenticated user ID
 * @param {string} req.userId - ID of the authenticated user (from auth middleware)
 * @param {Object} req.body - Request body containing update fields
 * @param {string} [req.body.firstName] - Updated first name
 * @param {string} [req.body.lastName] - Updated last name  
 * @param {number} [req.body.age] - Updated age
 * @param {string} [req.body.email] - Updated email address
 * @param {string} [req.body.password] - New password (will be hashed)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Updated user profile (excluding password hash)
 * @throws {200} User profile updated successfully
 * 
 * @description
 * Allows authenticated users to update their profile information including optional password change.
 * All fields are optional - only provided fields will be updated.
 * If a password is provided, it will be hashed before storage.
 * Returns the updated user document without the password hash.
 * 
 * @example
 * // PUT /users/me
 * // Headers: { Authorization: "Bearer <jwt_token>" }
 * // Body: { firstName: "Jane", email: "jane@example.com" }
 * // Response: { _id: "...", firstName: "Jane", lastName: "Doe", email: "jane@example.com", age: 25 }
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
 * Permanently deletes the authenticated user's account.
 * 
 * @async
 * @function deleteMe
 * @param {AuthRequest} req - Express request object with authenticated user ID
 * @param {string} req.userId - ID of the authenticated user (from auth middleware)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Confirmation message of account deletion
 * @throws {200} Account deleted successfully
 * 
 * @description
 * Permanently removes the authenticated user's account from the database.
 * This action is irreversible and will delete all user data.
 * The user's JWT token will become invalid after account deletion.
 * 
 * @security
 * - Requires valid authentication token
 * - Only allows users to delete their own account
 * - No recovery mechanism available
 * 
 * @example
 * // DELETE /users/me
 * // Headers: { Authorization: "Bearer <jwt_token>" }
 * // Response: { message: "Account deleted" }
 */
export async function deleteMe(req: AuthRequest, res: Response) {
  await User.findByIdAndDelete(req.userId);
  return res.json({ message: "Account deleted" });
}

/**
 * Changes the authenticated user's password with current password verification.
 * 
 * @async
 * @function changePassword
 * @param {any} req - Express request object with user ID and password data
 * @param {string} req.userId - ID of the authenticated user (from auth middleware)
 * @param {Object} req.body - Request body containing password change data
 * @param {string} req.body.currentPassword - User's current password for verification
 * @param {string} req.body.newPassword - New password to set
 * @param {string} req.body.confirmPassword - Confirmation of new password (must match newPassword)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Success message or error details
 * @throws {400} Missing required fields, passwords don't match, or current password incorrect
 * @throws {404} User not found
 * @throws {200} Password changed successfully
 * 
 * @description
 * Secure password change endpoint that requires:
 * 1. Current password verification
 * 2. New password confirmation matching
 * 3. Valid user authentication
 * 
 * The new password is hashed with bcrypt before storage for security.
 * 
 * @security
 * - Validates current password before allowing change
 * - Requires password confirmation to prevent typos
 * - Uses bcrypt hashing with salt rounds of 10
 * - Requires authentication token
 * 
 * @example
 * // POST /users/change-password
 * // Headers: { Authorization: "Bearer <jwt_token>" }
 * // Body: { currentPassword: "old123", newPassword: "new456", confirmPassword: "new456" }
 * // Response: { message: "Password changed" }
 */
export async function changePassword(req: any, res: Response) {
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
