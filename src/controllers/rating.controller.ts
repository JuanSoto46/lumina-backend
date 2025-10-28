import { Response } from "express";
import { Rating } from "../models/Rating.js";
import { AuthRequest } from "../middleware/auth.js";

/**
 * Controllers for managing video ratings.
 * 
 * @module controllers/rating.controller
 */

/**
 * Add or update a rating for a video.
 * 
 * @param {AuthRequest} req - Express request object with authentication
 * @param {Response} res - Express response object
 * @param {string} req.userId - User ID from auth middleware
 * @param {Object} req.body - Request body
 * @param {string} req.body.videoId - ID of the video being rated
 * @param {number} req.body.rating - Rating value (0-5)
 * 
 * @returns {Promise<void>}
 * 
 * @throws {401} If user is not authenticated
 * @throws {400} If videoId or rating is missing
 * @throws {500} If database operation fails
 */
export const addOrUpdateRating = async (req: AuthRequest, res: Response) => {
  const userId = req.userId; 
  const { videoId, rating } = req.body;

  if (!userId) return res.status(401).json({ error: "No autorizado" });
  if (!videoId || rating == null)
    return res.status(400).json({ error: "Missing videoId or rating" });

  try {
    const existing = await Rating.findOne({ userId, videoId });

    if (existing) {
      existing.rating = rating;
      await existing.save();
      return res.json({ message: "Rating updated", rating: existing });
    }

    const newRating = new Rating({ userId, videoId, rating });
    await newRating.save();
    res.status(201).json({ message: "Rating added", rating: newRating });
  } catch (err) {
    console.error("❌ Error al guardar calificación:", err);
    res.status(500).json({ error: "Failed to save rating" });
  }
};


/**
 * Get the average rating for a video.
 * 
 * @param {AuthRequest} req - Express request object
 * @param {Response} res - Express response object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.videoId - ID of the video
 * 
 * @returns {Promise<void>} Returns average rating and count
 * 
 * @throws {500} If database operation fails
 */
export const getAverageRating = async (req: AuthRequest, res: Response) => {
  const { videoId } = req.params;

  try {
    const ratings = await Rating.find({ videoId });
    if (ratings.length === 0)
      return res.json({ average: 0, count: 0 });

    const average = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    res.json({ average: Number(average.toFixed(2)), count: ratings.length });
  } catch (err) {
    console.error("❌ Error al obtener calificaciones:", err);
    res.status(500).json({ error: "Failed to fetch average rating" });
  }
};

/**
 * Get a user's rating for a specific video.
 * 
 * @param {AuthRequest} req - Express request object with authentication
 * @param {Response} res - Express response object
 * @param {string} req.userId - User ID from auth middleware
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.videoId - ID of the video
 * 
 * @returns {Promise<void>} Returns user's rating or 0 if not rated
 * 
 * @throws {401} If user is not authenticated
 * @throws {500} If database operation fails
 */
export const getUserRating = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { videoId } = req.params;

  if (!userId) return res.status(401).json({ error: "No autorizado" });

  try {
    const rating = await Rating.findOne({ userId, videoId });
    if (!rating) return res.json({ rating: 0 }); // si no existe, devuelve 0

    res.json({ rating: rating.rating });
  } catch (err) {
    console.error("❌ Error al obtener calificación del usuario:", err);
    res.status(500).json({ error: "Failed to fetch user rating" });
  }
};

/**
 * Remove a user's rating for a video.
 * 
 * @param {AuthRequest} req - Express request object with authentication
 * @param {Response} res - Express response object
 * @param {string} req.userId - User ID from auth middleware
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.videoId - ID of the video
 * 
 * @returns {Promise<void>}
 * 
 * @throws {401} If user is not authenticated
 * @throws {404} If rating not found
 * @throws {500} If database operation fails
 */
export const removeUserRating = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { videoId } = req.params;

  if (!userId) return res.status(401).json({ error: "No autorizado" });

  try {
    const deleted = await Rating.findOneAndDelete({ userId, videoId });
    if (!deleted) return res.status(404).json({ message: "No se encontró la calificación para eliminar" });

    res.json({ message: "Calificación eliminada" });
  } catch (err) {
    console.error("❌ Error al eliminar calificación:", err);
    res.status(500).json({ error: "Failed to delete rating" });
  }
};