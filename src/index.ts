/**
 * This TypeScript script sets up an Express server with routes for authentication and user operations,
 * connecting to a MongoDB database and listening on a specified port.
 */
// src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import pexelsRoutes from "./routes/pexels.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// --- CORS flexible: local + *.vercel.app + extras por env ---
const VERCEL_REGEX = /\.vercel\.app$/i;
const BASE_ALLOWED = new Set<string>([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

// Permite agregar dominios extra por env, separados por coma
const extra = (process.env.CORS_EXTRA_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
extra.forEach(o => BASE_ALLOWED.add(o));

function corsOrigin(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) {
  // Requests sin origin (curl, healthchecks) se aceptan
  if (!origin) return cb(null, true);

  // Local explícito
  if (BASE_ALLOWED.has(origin)) return cb(null, true);

  try {
    const u = new URL(origin);
    // Cualquier subdominio *.vercel.app en https
    if (u.protocol === "https:" && VERCEL_REGEX.test(u.hostname)) {
      return cb(null, true);
    }
  } catch {
    // origin inválido → cae al deny
  }

  cb(new Error(`CORS blocked for origin: ${origin}`));
}

app.use(express.json());


app.use((req, _res, next) => { console.log("Origin:", req.headers.origin); next(); });

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Responder preflight de una
app.options("*", cors({ origin: corsOrigin, credentials: true }));

// --- Salud y base ---
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => res.send("API up"));

// --- Rutas ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/pexels", pexelsRoutes);

// --- DB y arranque ---
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
