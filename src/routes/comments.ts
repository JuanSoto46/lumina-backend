// ...existing code...
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { addComment, getCommentsByVideo, updateComment, deleteComment } from "../controllers/comment.controller.js";
// ...existing code...

/**
 * Router for comment-related endpoints.
 *
 * Routes:
 *  - GET    /:videoId   -> Get comments for a video
 *  - POST   /           -> Add a comment (requires authentication)
 *  - PUT    /:id        -> Update a comment (requires authentication)
 *  - DELETE /:id        -> Delete a comment (requires authentication)
 *
 * @module routes/comments
 */

/**
 * Express Router instance for comment routes.
 * @type {import('express').Router}
 */
const router = Router();

/**
 * GET /:videoId
 * Retrieves all comments associated with a video.
 *
 * Path parameters:
 *  - videoId {string} ID of the video
 *
 * Success response:
 *  - 200: Array of comment objects
 *
 * Controller: getCommentsByVideo (imported from controllers/comment.controller.js).
 */
router.get("/:videoId", getCommentsByVideo);

/**
 * POST /
 * Creates a new comment. Requires authentication.
 *
 * Expected request body example:
 *  {
 *    videoId: string,
 *    text: string,
 *    authorId?: string
 *  }
 *
 * Success response:
 *  - 201: Created comment
 */
router.post("/", requireAuth, addComment);

/**
 * PUT /:id
 * Updates an existing comment. Requires authentication.
 *
 * Path parameters:
 *  - id {string} ID of the comment to update
 *
 * Expected request body example:
 *  {
 *    text: string
 *  }
 *
 * Success response:
 *  - 200: Updated comment
 */
router.put("/:id", requireAuth, updateComment);

/**
 * DELETE /:id
 * Deletes a comment. Requires authentication.
 *
 * Path parameters:
 *  - id {string} ID of the comment to delete
 *
 * Success response:
 *  - 204: No content
 */
router.delete("/:id", requireAuth, deleteComment);

/**
 * Default export: router to be mounted in the main application.
 * @exports default
 */
export default router;
