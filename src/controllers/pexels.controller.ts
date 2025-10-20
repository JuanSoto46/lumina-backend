/* This TypeScript code snippet is setting up an Express server to interact with the Pexels API for
fetching videos. Here's a breakdown of what each part of the code is doing: */
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

/** GET /videos/:id */
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

/** Healthcheck */
export const healthCheck = async (_req: Request, res: Response) => {
  res.send("Pexels API endpoints are running");
};