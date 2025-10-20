/**
 * @fileoverview
 * Initializes and configures an Express server for handling authentication,
 * user operations, and media routes. It connects to MongoDB, sets up CORS rules,
 * defines API routes, and starts listening on a specified port.
 *
 * The server supports flexible CORS configuration for local development,
 * Vercel deployments, and custom origins defined via environment variables.
 *
 * @module index
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import pexelsRoutes from "./routes/pexels.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// --- CORS configuration: local + *.vercel.app + extra from environment ---
const VERCEL_REGEX = /\.vercel\.app$/i;
const BASE_ALLOWED = new Set<string>([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

// Add additional allowed origins from environment variable (comma-separated)
const extra = (process.env.CORS_EXTRA_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
extra.forEach(o => BASE_ALLOWED.add(o));

/**
 * Custom CORS origin validation function.
 *
 * @param {string | undefined} origin - The origin of the incoming request.
 * @param {(err: Error | null, allow?: boolean) => void} cb - The callback to determine whether to allow or block the request.
 * @description
 * - Allows requests from localhost and additional allowed origins.
 * - Accepts any HTTPS subdomain under `*.vercel.app`.
 * - Denies invalid or unapproved origins.
 * - Requests without an origin (e.g., from CLI or health checks) are automatically allowed.
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

app.use(express.json());

// Log request origins for debugging
app.use((req, _res, next) => { 
  console.log("Origin:", req.headers.origin); 
  next(); 
});

// Apply global CORS middleware
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle preflight requests globally
app.options("*", cors({ origin: corsOrigin, credentials: true }));

// --- Health check and base endpoints ---
/**
 * Health check endpoint.
 * @route GET /health
 * @returns {object} `{ ok: true }` if the server is running.
 */
app.get("/health", (_req, res) => res.json({ ok: true }));

/**
 * Base API endpoint.
 * @route GET /
 * @returns {string} A confirmation message indicating that the API is running.
 */
app.get("/", (_req, res) => res.send("API up"));

// --- API Routes ---
/**
 * Authentication routes.
 * Handles sign up, login, password reset, etc.
 * @see {@link src/controllers/auth.controller.ts}
 */
app.use("/api/auth", authRoutes);

/**
 * User routes.
 * Handles profile management and password updates.
 * @see {@link src/controllers/user.controller.ts}
 */
app.use("/api/users", userRoutes);

/**
 * Pexels routes.
 * Provides endpoints for fetching and searching media content.
 * @see {@link src/controllers/pexels.controller.ts}
 */
app.use("/api/pexels", pexelsRoutes);

/**
 * Initializes MongoDB connection and starts the Express server.
 *
 * @async
 * @function start
 * @throws Will throw an error if `MONGO_URI` is missing or if the database connection fails.
 * @description
 * Connects to MongoDB using Mongoose and starts the server on the specified port.
 * Logs connection details and allowed CORS origins.
 */
async function start() {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) throw new Error("Missing MONGO_URI");

    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");

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

start();
