/**
 * @fileoverview Pexels API controller for fetching videos from the Pexels platform.
 * Provides endpoints for searching videos, getting popular content, and retrieving specific videos by ID.
 * @module controllers/pexels.controller
 * @version 1.0.0
 * @requires express
 * @requires pexels
 * @requires dotenv
 */

import { Request, Response } from "express";
import { createClient } from "pexels";
import dotenv from "dotenv";

dotenv.config();

/**
 * Pexels API client instance.
 * Initialized with API key from environment variables.
 * @type {any|null} - Pexels client instance or null if not configured
 */
let client: any = null;

// Initialize Pexels client if API key is available
if (process.env.PEXELS_API_KEY) {
  client = createClient(process.env.PEXELS_API_KEY);
  console.log("✅ Pexels client initialized");
} else {
  console.warn("⚠️  PEXELS_API_KEY not configured - Pexels endpoints will return errors");
}

/**
 * Retrieves popular videos from Pexels API.
 * 
 * @async
 * @function getPopularVideos
 * @param {Request} _req - Express request object (unused)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of popular video objects or error message
 * @throws {500} Pexels API not configured or failed to fetch videos
 * @throws {200} Successfully retrieved popular videos
 * 
 * @description
 * Fetches the most popular videos from Pexels with a limit of 3 videos per page.
 * Requires PEXELS_API_KEY environment variable to be set.
 * 
 * @example
 * // GET /pexels/popular
 * // Response: [{ id: 1, url: "...", video_files: [...], ... }]
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
    if ('videos' in data) {
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
 * Alternative endpoint for retrieving popular videos (Spanish naming convention).
 * 
 * @async
 * @function getPeliculas
 * @param {Request} _req - Express request object (unused)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Complete Pexels API response object with videos array or error message
 * @throws {500} Failed to fetch popular videos
 * @throws {200} Successfully retrieved popular videos with full response metadata
 * 
 * @description
 * Similar to getPopularVideos but returns the complete API response object 
 * instead of just the videos array. Fetches 3 popular videos per page.
 * Note: This function doesn't check if client is initialized (potential bug).
 * 
 * @example
 * // GET /pexels/peliculas  
 * // Response: { videos: [...], page: 1, per_page: 3, total_results: 1000, ... }
 */
export const getPeliculas = async (_req: Request, res: Response) => {
  try {
    const data = await client.videos.popular({ per_page: 3 });
    if ('videos' in data) {
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
 * Searches for videos on Pexels based on query parameters.
 * 
 * @async
 * @function getVideos
 * @param {Request} req - Express request object containing search parameters
 * @param {string} [req.query.query] - Single search query string
 * @param {string} [req.query.terms] - Comma-separated search terms
 * @param {string|number} [req.query.per_page=3] - Number of videos per page (max 80)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Pexels search results with videos array or error message
 * @throws {400} Neither query nor terms parameter provided, or invalid terms format
 * @throws {500} Failed to search videos
 * @throws {200} Successfully retrieved search results
 * 
 * @description
 * Flexible video search endpoint supporting multiple search modes:
 * 1. Simple query: ?query=nature
 * 2. Multiple terms: ?terms=ocean,waves,sunset  
 * 3. Combined: ?query=nature&terms=forest,trees
 * 
 * The function combines query and terms intelligently and enforces Pexels' 80 video limit.
 * 
 * @example
 * // GET /pexels/videos?query=ocean&per_page=5
 * // GET /pexels/videos?terms=nature,forest,mountains
 * // Response: { videos: [...], page: 1, per_page: 5, ... }
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
      // If both are present, combine them
      const termsArray = terms.split(",").map(term => term.trim()).filter(Boolean);
      searchQuery = `${query} ${termsArray.join(" ")}`;
    } else if (terms) {
      // Multiple terms only
      const termsArray = terms.split(",").map(term => term.trim()).filter(Boolean);
      if (termsArray.length === 0) {
        return res.status(400).json({ error: "Invalid terms format" });
      }
      searchQuery = termsArray.join(" ");
    } else {
      // Simple query only
      searchQuery = query;
    }

    const data = await client.videos.search({ 
      query: searchQuery, 
      per_page: Math.min(per_page, 80) // Limit to maximum 80 as allowed by Pexels
    });
    
    if ('videos' in data) {
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
 * Retrieves a specific video by its ID from Pexels API.
 * 
 * @async
 * @function getVideoById
 * @param {Request} req - Express request object containing video ID parameter
 * @param {string} req.params.id - Video ID (will be converted to number)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Single video object or error message
 * @throws {400} Invalid video ID (non-numeric or falsy)
 * @throws {404} Video not found
 * @throws {500} Failed to fetch video by ID
 * @throws {200} Successfully retrieved video details
 * 
 * @description
 * Fetches detailed information about a specific video using its unique Pexels ID.
 * The ID parameter is validated and converted to a number before making the API call.
 * 
 * @example
 * // GET /videos/123456
 * // Response: { id: 123456, url: "...", video_files: [...], user: {...}, ... }
 */
export const getVideoById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid video ID" });

  try {
    const video = await client.videos.show({ id });
    if ('id' in video) {
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
 * Health check endpoint for Pexels API service status.
 * 
 * @async
 * @function healthCheck
 * @param {Request} _req - Express request object (unused)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Simple text response indicating service status
 * @throws {200} Service is running normally
 * 
 * @description
 * Basic health check endpoint that confirms the Pexels API endpoints are operational.
 * Returns a simple text message without performing actual API calls.
 * Useful for monitoring and load balancer health checks.
 * 
 * @example
 * // GET /pexels/health
 * // Response: "Pexels API endpoints are running"
 */
export const healthCheck = async (_req: Request, res: Response) => {
  res.send("Pexels API endpoints are running");
};