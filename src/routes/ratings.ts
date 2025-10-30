import { Router } from "express";
import { addOrUpdateRating, getAverageRating, getUserRating, removeUserRating } from "../controllers/rating.controller.js";
import { requireAuth } from "../middleware/auth.js";

/**
 * Router for rating-related endpoints.
 *
 * Routes:
 *  - POST   /           -> Add/update a rating (requires authentication)
 *  - GET    /:videoId   -> Get average rating for a video
 *  - GET    /:videoId/user -> Get user's rating for a video (requires authentication)
 *  - DELETE /:videoId   -> Remove user's rating (requires authentication)
 *
 * @module routes/ratings
 */

/**
 * Express Router instance for rating routes.
 * @type {import('express').Router}
 */
const router = Router();

/**
 * POST /
 * Creates or updates a user's rating for a video. Requires authentication.
 *
 * Expected request body:
 *  {
 *    videoId: string,
 *    rating: number (1-5)
 *  }
 *
 * Success response:
 *  - 200: Updated rating object
 */
router.post("/", requireAuth, addOrUpdateRating);

/**
 * GET /:videoId
 * Retrieves the average rating for a video.
 *
 * Path parameters:
 *  - videoId {string} ID of the video
 *
 * Success response:
 *  - 200: { average: number, count: number }
 */
router.get("/:videoId", getAverageRating);

/**
 * GET /:videoId/user
 * Gets the authenticated user's rating for a video.
 *
 * Path parameters:
 *  - videoId {string} ID of the video
 *
 * Success response:
 *  - 200: Rating object or null if not rated
 */
router.get("/:videoId/user", requireAuth, getUserRating);

/**
 * DELETE /:videoId
 * Removes the authenticated user's rating for a video.
 *
 * Path parameters:
 *  - videoId {string} ID of the video
 *
 * Success response:
 *  - 204: No content
 */
router.delete("/:videoId", requireAuth, removeUserRating);

/**
 * Default export: router to be mounted in the main application.
 * @exports default
 */
export default router;