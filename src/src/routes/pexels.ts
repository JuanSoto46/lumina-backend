/**
 * @fileoverview Defines routes for interacting with the Pexels API.
 * 
 * This router provides endpoints to fetch popular videos, search for videos,
 * retrieve specific video details by ID, and check API health status.
 * 
 * Each route connects to a corresponding controller function that handles
 * the logic for making requests to the Pexels API using the Pexels SDK client.
 */

import { Router } from 'express';
import { 
  getVideos, 
  getVideoById, 
  getPopularVideos, 
  getPeliculas,
  healthCheck 
} from '../controllers/pexels.controller.js';

const router = Router();

/**
 * GET /
 * 
 * Health check endpoint to confirm that the Pexels API routes are active.
 * 
 * @route GET /
 * @access Public
 * @returns {string} "Pexels API endpoints are running"
 */
router.get('/', healthCheck);

/**
 * GET /videos/popular
 * 
 * Fetches a list of popular videos from the Pexels API.
 * 
 * @route GET /videos/popular
 * @access Public
 */
router.get('/videos/popular', getPopularVideos);

/**
 * GET /peliculas
 * 
 * Retrieves a paginated list of popular videos, similar to `/videos/popular`.
 * 
 * @route GET /peliculas
 * @access Public
 */
router.get('/peliculas', getPeliculas);

/**
 * GET /videos/search
 * 
 * Searches for videos on Pexels based on query parameters such as `query` and `terms`.
 * 
 * @route GET /videos/search
 * @access Public
 * @param {string} [query] - Main search keyword.
 * @param {string} [terms] - Comma-separated additional search terms.
 * @param {number} [per_page=3] - Number of videos to return (max 80).
 * */
router.get('/videos/search', getVideos);

/**
 * GET /videos/:id
 * 
 * Retrieves detailed information for a single video by its Pexels ID.
 * 
 * @route GET /videos/:id
 * @access Public
 * @param {number} id - The Pexels video ID.
 */
router.get('/videos/:id', getVideoById);

export default router;
