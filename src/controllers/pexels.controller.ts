/**
 * @fileoverview Express controller that interacts with the Pexels API to fetch and search for videos.
 * Handles endpoints for popular videos, search, video details, and server health check.
 * 
 * Requires the `PEXELS_API_KEY` environment variable to be set in a `.env` file.
 */

import { Request, Response } from "express";
import { createClient } from "pexels";
import dotenv from "dotenv";

dotenv.config();

let client: any = null;

if (process.env.PEXELS_API_KEY) {
  client = createClient(process.env.PEXELS_API_KEY);
  console.log("✅ Pexels client initialized");
} else {
  console.warn("⚠️  PEXELS_API_KEY not configured - Pexels endpoints will return errors");
}

/**
 * Fetches the most popular videos from Pexels.
 *
 * @async
 * @function getPopularVideos
 * @param {Request} _req - Express request object (not used).
 * @param {Response} res - Express response object.
 * @returns {Promise<Response>} JSON array of popular videos or an error message.
 */
export const getPopularVideos = async (_req: Request, res: Response) => {
  if (!client) {
    return res.status(500).json({ 
      error: "Pexels API not configured", 
      message: "PEXELS_API_KEY environment variable is required" 
    });
  }
  
  try {
    const data = await client.videos.popular({ per_page: 3 });
    if ("videos" in data) {
      res.json(data.videos);
    } else {
      res.status(500).json({ error: "Failed to fetch popular videos" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch popular videos" });
  }
};

/**
 * Fetches a short list of popular videos from Pexels (alias for testing or custom route).
 *
 * @async
 * @function getPeliculas
 * @param {Request} _req - Express request object (not used).
 * @param {Response} res - Express response object.
 * @returns {Promise<Response>} JSON object containing popular videos or an error.
 */
export const getPeliculas = async (_req: Request, res: Response) => {
  try {
    const data = await client.videos.popular({ per_page: 3 });
    if ("videos" in data) {
      res.json(data);
    } else {
      res.status(500).json({ error: "Failed to fetch popular videos" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch popular videos" });
  }
};

/**
 * Searches for videos on Pexels based on a query or a list of terms.
 *
 * @async
 * @function getVideos
 * @param {Request} req - Express request object containing query parameters.
 * @param {string} [req.query.query] - Main search term (optional if `terms` provided).
 * @param {string} [req.query.terms] - Comma-separated list of additional search terms.
 * @param {number} [req.query.per_page=3] - Number of videos to return (max 80).
 * @param {Response} res - Express response object.
 * @returns {Promise<Response>} JSON response with search results or error message.
 */
export const getVideos = async (req: Request, res: Response) => {
  const query = req.query.query as string;
  const terms = req.query.terms as string;
  const per_page = Number(req.query.per_page) || 3;

  if (!query && !terms) {
    return res.status(400).json({ 
      error: "Either 'query' or 'terms' parameter is required" 
    });
  }

  try {
    let searchQuery = "";

    if (query && terms) {
      const termsArray = terms.split(",").map(term => term.trim()).filter(Boolean);
      searchQuery = `${query} ${termsArray.join(" ")}`;
    } else if (terms) {
      const termsArray = terms.split(",").map(term => term.trim()).filter(Boolean);
      if (termsArray.length === 0) {
        return res.status(400).json({ error: "Invalid terms format" });
      }
      searchQuery = termsArray.join(" ");
    } else {
      searchQuery = query;
    }

    const data = await client.videos.search({ 
      query: searchQuery, 
      per_page: Math.min(per_page, 80)
    });
    
    if ("videos" in data) {
      res.json(data);
    } else {
      res.status(500).json({ error: "Failed to search videos" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to search videos" });
  }
};

/**
 * Retrieves detailed information about a specific video by its ID.
 *
 * @async
 * @function getVideoById
 * @param {Request} req - Express request object containing the video ID in params.
 * @param {string} req.params.id - ID of the video to fetch.
 * @param {Response} res - Express response object.
 * @returns {Promise<Response>} JSON response with video details or error message.
 */
export const getVideoById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid video ID" });

  try {
    const video = await client.videos.show({ id });
    if ("id" in video) {
      res.json(video);
    } else {
      res.status(404).json({ error: "Video not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch video by ID" });
  }
};

/**
 * Health check endpoint to verify the API is running.
 *
 * @function healthCheck
 * @param {Request} _req - Express request object (not used).
 * @param {Response} res - Express response object.
 * @returns {Response} Plain text response confirming the service is active.
 */
export const healthCheck = async (_req: Request, res: Response) => {
  res.send("Pexels API endpoints are running");
};
