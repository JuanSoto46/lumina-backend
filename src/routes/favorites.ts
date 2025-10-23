import express from "express";
import { addFavorite, getFavorites, removeFavorite } from "../controllers/favorites.controller.js";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

/**
 * @fileoverview Routes for managing user's favorite videos.
 * @module routes/favorites
 */

/**
 * @route POST /favorites
 * @summary Add a video to the authenticated user's favorites list.
 * @security BearerAuth
 * @param {Object} req.body - Video data to add to favorites.
 * @param {string} req.body.id - Unique video identifier.
 * @param {string} req.body.title - Title of the video.
 * @param {string} req.body.url - URL of the video.
 * @param {string} req.body.thumbnail - Thumbnail image URL.
 * @returns {Object} 200 - Confirmation message and updated favorites array.
 * @returns {Object} 400 - Video already exists in favorites.
 * @returns {Object} 401 - Unauthorized if no valid token is provided.
 * @returns {Object} 500 - Internal server error.
 */
router.post("/", requireAuth, addFavorite);

/**
 * @route GET /favorites
 * @summary Retrieve the authenticated user's list of favorite videos.
 * @security BearerAuth
 * @returns {Object[]} 200 - Array of favorite videos.
 * @returns {Object} 401 - Unauthorized if no valid token is provided.
 * @returns {Object} 500 - Internal server error.
 */
router.get("/", requireAuth, getFavorites);

/**
 * @route DELETE /favorites/:id
 * @summary Remove a video from the authenticated user's favorites list by video ID.
 * @security BearerAuth
 * @param {string} req.params.id - ID of the video to remove from favorites.
 * @returns {Object} 200 - Confirmation message and updated favorites array.
 * @returns {Object} 404 - User not found or video not in favorites.
 * @returns {Object} 500 - Internal server error.
 */
router.delete("/:id", requireAuth, removeFavorite);

export default router;
