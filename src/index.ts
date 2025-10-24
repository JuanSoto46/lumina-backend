/**
 * @fileoverview Main server entry point for Lumina Backend API.
 * Sets up Express server with authentication, user management, and Pexels integration.
 * Includes flexible CORS configuration and MongoDB connection.
 * @module index
 * @version 1.0.0
 * @author Lumina Backend Team
 * @requires express
 * @requires cors
 * @requires mongoose
 * @requires dotenv/config
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import pexelsRoutes from "./routes/pexels.js";
import favoriteRoutes from "./routes/favorites.js";

/**
 * Express application instance.
 * @type {express.Application}
 */
const app = express();

/**
 * Server port number from environment variable or default to 3000.
 * @type {number}
 * @environment PORT - Optional port number (defaults to 3000)
 */
const PORT = Number(process.env.PORT) || 3000;

/**
 * Regular expression to match Vercel deployment domains.
 * @type {RegExp}
 * @description Matches any subdomain ending with .vercel.app (case insensitive)
 */
const VERCEL_REGEX = /\.vercel\.app$/i;

/**
 * Set of explicitly allowed CORS origins for local development.
 * @type {Set<string>}
 * @description Base set includes common local development URLs
 */
const BASE_ALLOWED = new Set<string>([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

/**
 * Additional CORS origins from environment variable configuration.
 * @type {string[]}
 * @environment CORS_EXTRA_ORIGINS - Comma-separated list of additional allowed origins
 */
const extra = (process.env.CORS_EXTRA_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
extra.forEach(o => BASE_ALLOWED.add(o));

/**
 * CORS origin validation function with flexible domain matching.
 * 
 * @function corsOrigin
 * @param {string | undefined} origin - The origin header from the request
 * @param {Function} cb - Callback function to indicate if origin is allowed
 * @param {Error | null} cb.err - Error object if origin should be blocked
 * @param {boolean} [cb.allow] - Whether to allow the origin (true/false)
 * 
 * @description
 * Implements flexible CORS policy that allows:
 * 1. Requests without origin (curl, healthchecks, mobile apps)
 * 2. Explicitly configured origins in BASE_ALLOWED set
 * 3. Any HTTPS subdomain matching *.vercel.app pattern
 * 4. Additional origins from CORS_EXTRA_ORIGINS environment variable
 * 
 * @security
 * - Rejects HTTP origins on Vercel (only HTTPS allowed)
 * - Validates URL format before checking patterns
 * - Provides descriptive error messages for blocked origins
 * 
 * @example
 * // Allowed origins:
 * // - http://localhost:5173 (local dev)
 * // - https://myapp-abc123.vercel.app (Vercel deployment)
 * // - Custom origins from CORS_EXTRA_ORIGINS env var
 */
function corsOrigin(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) {
  // Allow requests without origin (CLI, health checks)
  if (!origin) return cb(null, true);

  // Allow explicit local origins
  if (BASE_ALLOWED.has(origin)) return cb(null, true);

  try {
    const u = new URL(origin);
    // Allow HTTPS subdomains under *.vercel.app
    if (u.protocol === "https:" && VERCEL_REGEX.test(u.hostname)) {
      return cb(null, true);
    }
  } catch {
    // Invalid origin → falls through to deny
  }

  cb(new Error(`CORS blocked for origin: ${origin}`));
}

/**
 * Configure Express middleware for JSON parsing.
 * Enables automatic parsing of JSON request bodies.
 */
app.use(express.json());

/**
 * Debug middleware to log request origins.
 * Helps with CORS troubleshooting during development.
 */
app.use((req, _res, next) => { console.log("Origin:", req.headers.origin); next(); });

/**
 * Configure CORS middleware with flexible origin validation.
 * @description
 * Enables cross-origin requests with:
 * - Dynamic origin validation via corsOrigin function
 * - Credentials support for authenticated requests
 * - Standard HTTP methods for REST API
 * - Content-Type and Authorization headers
 */
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/**
 * Handle preflight OPTIONS requests explicitly.
 * Ensures proper CORS headers are sent for complex requests.
 */
app.options("*", cors({ origin: corsOrigin, credentials: true }));

/**
 * Health check endpoint for monitoring and load balancers.
 * @route GET /health
 * @returns {Object} Simple health status object
 */
app.get("/health", (_req, res) => res.json({ ok: true }));

/**
 * Root endpoint indicating API is operational.
 * @route GET /
 * @returns {string} Simple "API up" message
 */
app.get("/", (_req, res) => res.send("API up"));

/**
 * Authentication routes (signup, login, password reset).
 * @route /api/auth
 * @see {@link ./routes/auth.js} Authentication route handlers
 */
app.use("/api/auth", authRoutes);

/**
 * User management routes (profile, settings, account operations).
 * @route /api/users
 * @see {@link ./routes/users.js} User route handlers
 */
app.use("/api/users", userRoutes);

/**
 * Pexels API integration routes (video search, popular content).
 * @route /api/pexels
 * @see {@link ./routes/pexels.js} Pexels route handlers
 */
app.use("/api/pexels", pexelsRoutes);

app.use("/api/favorites", favoriteRoutes);

/**
 * Initializes and starts the Express server with database connection.
 * 
 * @async
 * @function start
 * @returns {Promise<void>} Resolves when server starts successfully
 * @throws {Error} Exits process with code 1 on initialization failure
 * 
 * @description
 * Server initialization sequence:
 * 1. Validates required environment variables
 * 2. Establishes MongoDB connection using Mongoose
 * 3. Starts Express server on specified port
 * 4. Logs server status and CORS configuration
 * 5. Exits process on any critical errors
 * 
 * @environment
 * Required environment variables:
 * - MONGO_URI: MongoDB connection string
 * - PORT: (Optional) Server port number (defaults to 3000)
 * - CORS_EXTRA_ORIGINS: (Optional) Additional allowed CORS origins
 * 
 * @example
 * // Environment setup
 * MONGO_URI=mongodb://localhost:27017/lumina
 * PORT=3000
 * CORS_EXTRA_ORIGINS=https://mydomain.com,https://anotherdomain.com
 * 
 * @logging
 * Logs include:
 * - MongoDB connection status
 * - Server port and host information
 * - Complete CORS configuration summary
 * - Additional origins from environment
 */
async function start() {
  try {
    // Validate required environment variables
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) throw new Error("Missing MONGO_URI");
    
    // Connect to MongoDB database
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");

    // Start Express server
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on :${PORT}`);
      console.log("CORS allowed:");
      console.log(" - Local:", Array.from(BASE_ALLOWED).join(", ") || "(none)");
      console.log(" - Regex: *.vercel.app (https)");
      if (extra.length) console.log(" - Extras:", extra.join(", "));
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

/**
 * Start the application server.
 * Entry point for the Lumina Backend API.
 */
start();