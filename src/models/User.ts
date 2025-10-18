/* This TypeScript code snippet defines a middleware function named `requireAuth` for Express.js that
enforces authentication using JSON Web Tokens (JWT). Here's a breakdown of what each part of the
code does: */
import mongoose from "mongoose";

export interface IUser extends mongoose.Document {
  firstName: string;
  lastName: string;
  age: number;
  email: string;
  passwordHash: string;
  resetToken?: string;
  resetTokenExp?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  age: { type: Number, required: true, min: 18 },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
  resetToken: { type: String },
  resetTokenExp: { type: Date }
}, { timestamps: true });

export const User = mongoose.model<IUser>("User", userSchema);
