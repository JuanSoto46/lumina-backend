/**
 * This TypeScript script sets up an Express server with routes for authentication and user operations,
 * connecting to a MongoDB database and listening on a specified port.
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import pexelsRoutes from "./routes/pexels";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CLIENT_URL?.split(",") || ["http://localhost:5173"], credentials: true }));
app.use(express.json());

app.get("/", (_req, res) => res.send("API up"));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/pexels", pexelsRoutes);

async function start() {
  try {
    if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on :${PORT}`));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
start();
