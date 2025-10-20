// src/models/User.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  age: number;
  email: string;
  passwordHash: string;

  // Campos NUEVOS para reset seguro
  passwordResetTokenHash?: string;
  passwordResetTokenExp?: Date;

  // Campos LEGACY por si quedaron en la DB de antes
  resetToken?: string;
  resetTokenExp?: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    age: { type: Number, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },

    // NUEVOS
    passwordResetTokenHash: { type: String, index: true },
    passwordResetTokenExp: { type: Date },

    // LEGACY (no los uses, solo por compatibilidad si ya existen docs con esto)
    resetToken: { type: String },
    resetTokenExp: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);
