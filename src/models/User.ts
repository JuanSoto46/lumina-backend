// src/models/User.ts
import mongoose, { Schema, Document } from "mongoose";

/**
 * Represents a User document stored in MongoDB.
 *
 * @interface IUser
 * @extends {Document}
 *
 * @property {string} firstName - The user's first name.
 * @property {string} lastName - The user's last name.
 * @property {number} age - The user's age.
 * @property {string} email - The user's unique email address.
 * @property {string} passwordHash - Secure hash of the user's password.
 *
 * @property {string} [passwordResetTokenHash] - Hash of the password reset token (new secure version).
 * @property {Date} [passwordResetTokenExp] - Expiration date of the secure password reset token.
 *
 * @property {string} [resetToken] - Legacy reset token field (kept only for backward compatibility).
 * @property {Date} [resetTokenExp] - Expiration date of the legacy reset token.
 */
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

/**
 * Defines the Mongoose schema for the `User` collection.
 *
 * This schema includes both new secure password reset fields and
 * legacy ones for backward compatibility with older database entries.
 *
 * @constant
 * @type {Schema<IUser>}
 *
 * @property {string} firstName - The user's first name (required).
 * @property {string} lastName - The user's last name (required).
 * @property {number} age - The user's age (required).
 * @property {string} email - The user's unique and indexed email (required).
 * @property {string} passwordHash - The hashed password (required).
 * @property {string} [passwordResetTokenHash] - Secure hashed token for password reset.
 * @property {Date} [passwordResetTokenExp] - Expiration date for the secure reset token.
 * @property {string} [resetToken] - Deprecated legacy token for backward compatibility.
 * @property {Date} [resetTokenExp] - Expiration date for the legacy reset token.
 */
const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    age: { type: Number, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },

    // New secure reset fields
    passwordResetTokenHash: { type: String, index: true },
    passwordResetTokenExp: { type: Date },

    resetToken: { type: String },
    resetTokenExp: { type: Date },
  },
  { timestamps: true }
);

/**
 * Mongoose model for interacting with the `users` collection in MongoDB.
 *
 * Provides CRUD operations and query helpers for user documents.
 *
 * @constant
 * @type {mongoose.Model<IUser>}
 */
export const User = mongoose.model<IUser>("User", userSchema);
