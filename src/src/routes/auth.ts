/**
 * @fileoverview Defines authentication-related routes for the Express application.
 * 
 * This router handles user registration, login, and password recovery actions.
 * It connects each endpoint to its corresponding controller function.
 */

import { Router } from "express";
import { signUp, login, forgotPassword, resetPassword } from "../controllers/auth.controller.js";

const router = Router();

/**
 * POST /signup
 * 
 * Registers a new user in the system.
 * 
 * @route POST /api/auth/signup
 * @access Public
 */
router.post("/signup", signUp);

/**
 * POST /login
 * 
 * Authenticates a user and returns a JWT token if credentials are valid.
 * 
 * @route POST /api/auth/login
 * @access Public
 */
router.post("/login", login);

/**
 * POST /forgot
 * 
 * Initiates the password recovery process by sending a reset link or token
 * to the user's registered email.
 * 
 * @route POST /api/auth/forgot
 * @access Public
 */
router.post("/forgot", forgotPassword);

/**
 * POST /reset
 * 
 * Resets a user's password using a valid reset token.
 * 
 * @route POST /api/auth/reset
 * @access Public
 */
router.post("/reset", resetPassword);

// Optional or placeholder route (currently does nothing)
router.post("/");

export default router;
