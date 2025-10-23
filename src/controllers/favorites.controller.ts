import { Request, Response } from "express";
import { User } from "../models/User.js";
import { AuthRequest } from "../middleware/auth.js";

/**
 * Adds a video to the authenticated user's favorites list.
 *
 * @async
 * @param {AuthRequest} req - Express request object with user authentication data.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>} Sends a JSON response with a success message and updated favorites, 
 * or an error message in case of failure.
 */
export const addFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const { id, title, url, thumbnail } = req.body;
    const userId = req.userId;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.favorites.some((fav) => fav.id === id)) {
      return res.status(400).json({ message: "Video already in favorites" });
    }

    user.favorites.push({ id, title, url, thumbnail, addedAt: new Date() });
    await user.save();

    return res.status(200).json({ message: "Video added to favorites", favorites: user.favorites });
  } catch (error) {
    console.error("Error adding favorite:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Retrieves the list of favorite videos for the authenticated user.
 *
 * @async
 * @param {AuthRequest} req - Express request object with user authentication data.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>} Sends a JSON response with the user's favorites, 
 * or an error message in case of failure.
 */
export const getFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user.favorites);
  } catch (error) {
    console.error("Error retrieving favorites:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Removes a video from the authenticated user's favorites list by video ID.
 *
 * @async
 * @param {AuthRequest} req - Express request object with user authentication data.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>} Sends a JSON response with a success message and updated favorites, 
 * or an error message in case of failure.
 */
export const removeFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.favorites = user.favorites.filter((fav) => fav.id !== id);
    await user.save();

    res.status(200).json({ message: "Video removed from favorites", favorites: user.favorites });
  } catch (error) {
    console.error("Error removing favorite:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
