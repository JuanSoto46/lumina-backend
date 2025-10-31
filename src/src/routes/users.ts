/**
 * @fileoverview Defines routes for user-related operations using the Express framework.
 * 
 * These routes handle actions related to the authenticated user, including:
 * - Retrieving personal information (`/me`)
 * - Updating profile data
 * - Deleting the account
 * - Changing the password
 * 
 * All routes require authentication via JWT, enforced by the `requireAuth` middleware.
 */

import { Router } from "express";
import { me, updateMe, deleteMe, changePassword } from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * GET /me
 * 
 * Retrieves the profile information of the currently authenticated user.
 * 
 * @route GET /me
 * @access Private
 * @middleware requireAuth
 * @returns {Object} The user's profile data.
 */
router.get("/me", requireAuth, me);

/**
 * PUT /me
 * 
 * Updates the profile information of the authenticated user.
 * 
 * @route PUT /me
 * @access Private
 * @middleware requireAuth
 * @param {Object} body - The fields to update (e.g., firstName, lastName, age).
 * @returns {Object} The updated user data.
 */
router.put("/me", requireAuth, updateMe);

/**
 * DELETE /me
 * 
 * Deletes the currently authenticated user's account.
 * 
 * @route DELETE /me
 * @access Private
 * @middleware requireAuth
 * @returns {Object} A confirmation message after successful deletion.
 */
router.delete("/me", requireAuth, deleteMe);

/**
 * PUT /password
 * 
 * Allows an authenticated user to change their password.
 * 
 * @route PUT /password
 * @access Private
 * @middleware requireAuth
 * @param {Object} body - Contains `currentPassword` and `newPassword`.
 * @returns {Object} A success message upon password update.
 */
router.put("/password", requireAuth, changePassword);

export default router;
