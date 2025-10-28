import { Request, Response } from "express";
import { Comment } from "../models/Comment.js";
import { User } from "../models/User.js";
import { AuthRequest } from "../middleware/auth.js";

/**
 * Controllers for CRUD operations on comments.
 *
 * @module controllers/comment.controller
 */

/**
 * Create a new comment associated with a video.
 *
 * Requires authentication (AuthRequest) — middleware must set req.userId.
 *
 * Expected body:
 *  - videoId: string
 *  - content: string
 *
 * Responses:
 *  - 201: Created comment (comment object with populated user)
 *  - 400: Empty comment
 *  - 401: Unauthorized
 *  - 500: Internal server error
 *
 * @param {AuthRequest} req - Authenticated request containing userId and body.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId, content } = req.body;
    const userId = req.userId;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!content.trim()) return res.status(400).json({ message: "Empty comment" });

    const comment = await Comment.create({ user: userId, videoId, content });
    await comment.populate("user", "firstName lastName email");

    res.status(201).json(comment);
  } catch (err) {
    console.error("Error creating comment:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Retrieve all comments for a given video.
 *
 * Route params:
 *  - videoId: string
 *
 * Responses:
 *  - 200: Array of comments (each with populated user)
 *  - 500: Internal server error
 *
 * @param {Request} req - Express request (expects req.params.videoId).
 * @param {Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getCommentsByVideo = async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    const comments = await Comment.find({ videoId })
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json(comments);
  } catch (err) {
    console.error("Error getting comments:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Update the content of an existing comment.
 *
 * Requires authentication; only the author (comment.user) may update.
 *
 * Route params:
 *  - id: string (comment ID)
 *
 * Expected body:
 *  - content: string
 *
 * Responses:
 *  - 200: Updated comment
 *  - 403: Forbidden (not the author)
 *  - 404: Comment not found
 *  - 500: Internal server error
 *
 * @param {AuthRequest} req - Authenticated request (req.userId) with req.params.id and body.content.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const updateComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.user.toString() !== req.userId)
      return res.status(403).json({ message: "Not allowed" });

    comment.content = content;
    await comment.save();

    res.status(200).json(comment);
  } catch (err) {
    console.error("Error updating comment:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Delete a comment.
 *
 * Requires authentication; only the author may delete their comment.
 *
 * Route params:
 *  - id: string (comment ID)
 *
 * Responses:
 *  - 200: { message: "Comment deleted" }
 *  - 403: Forbidden (not the author)
 *  - 404: Comment not found
 *  - 500: Internal server error
 *
 * @param {AuthRequest} req - Authenticated request containing req.params.id and req.userId.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.user.toString() !== req.userId)
      return res.status(403).json({ message: "Not allowed" });

    await comment.deleteOne();

    res.status(200).json({ message: "Comment deleted" });
  } catch (err) {
    console.error("Error deleting comment:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
