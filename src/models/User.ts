/**
 * @fileoverview User data model for MongoDB using Mongoose ODM.
 * Defines the user schema with authentication and password reset functionality.
 * @module models/User
 * @version 1.0.0
 * @requires mongoose
 */

import mongoose, { Schema, Document } from "mongoose";

/**
 * User interface extending Mongoose Document for TypeScript type safety.
 * 
 * @interface IUser
 * @extends {Document}
 * @description
 * Defines the structure of a User document in MongoDB with all required fields,
 * authentication data, and password reset functionality. Includes both current
 * secure reset token fields and legacy fields for backward compatibility.
 */
export interface IUser extends Document {
  /** 
   * User's first name.
   * @type {string}
   * @required
   */
  firstName: string;

  /** 
   * User's last name.
   * @type {string}
   * @required
   */
  lastName: string;

  /** 
   * User's age in years.
   * @type {number}
   * @required
   */
  age: number;

  /** 
   * User's email address. Must be unique across all users.
   * @type {string}
   * @required
   * @unique
   * @indexed
   */
  email: string;

  /** 
   * Hashed password using bcrypt. Never store plain text passwords.
   * @type {string}
   * @required
   * @security Bcrypt hash with salt rounds
   */
  passwordHash: string;

  /** 
   * SHA256 hash of password reset token for secure password recovery.
   * @type {string}
   * @optional
   * @indexed
   * @security Only stores hash, never the actual token
   * @since 1.0.0 - Replaces legacy resetToken field
   */
  passwordResetTokenHash?: string;

  /** 
   * Expiration timestamp for password reset token.
   * @type {Date}
   * @optional
   * @security Tokens expire after 60 minutes for security
   */
  passwordResetTokenExp?: Date;

  /** 
   * Legacy password reset token field for backward compatibility.
   * @type {string}
   * @optional
   * @deprecated Use passwordResetTokenHash instead for security
   * @security This field stores tokens in plain text - avoid using
   */
  resetToken?: string;

  /** 
   * Legacy expiration timestamp for reset tokens.
   * @type {Date}
   * @optional
   * @deprecated Use passwordResetTokenExp instead
   */
  resetTokenExp?: Date;

  favorites: IFavorite[];

}

/**
 * Mongoose schema definition for User collection.
 * 
 * @constant {Schema<IUser>} userSchema
 * @description
 * Defines the MongoDB document structure with validation rules, indexes, and constraints.
 * Includes automatic timestamps (createdAt, updatedAt) and proper indexing for performance.
 * 
 * @features
 * - Email uniqueness constraint with index
 * - Password reset token indexing for efficient lookups
 * - Automatic timestamps for audit trail
 * - Legacy field support for backward compatibility
 * - TypeScript type safety with IUser interface
 * 
 * @security
 * - Passwords are stored as bcrypt hashes only
 * - Reset tokens are stored as SHA256 hashes (new implementation)
 * - Email field is indexed for fast authentication lookups
 */
const userSchema = new Schema<IUser>(
  {
    /** User's first name - required field */
    firstName: { type: String, required: true },
    /** User's last name - required field */
    lastName: { type: String, required: true },
    /** User's age - required numeric field */
    age: { type: Number, required: true },
    /** User's email - unique and indexed for authentication */
    email: { type: String, required: true, unique: true, index: true },
    /** Bcrypt hashed password - required for authentication */
    passwordHash: { type: String, required: true },

    /** SHA256 hash of password reset token - indexed for efficient lookups */
    passwordResetTokenHash: { type: String, index: true },
    /** Expiration date for password reset token */
    passwordResetTokenExp: { type: Date },

    /** Legacy reset token field - deprecated, use passwordResetTokenHash instead */
    resetToken: { type: String },
    /** Legacy reset token expiration - deprecated, use passwordResetTokenExp instead */
    resetTokenExp: { type: Date },

    /* The `favorites` field in the `userSchema` is defining an array of `IFavorite` objects using the
    `favoriteSchema` schema. */
    favorites: {
      type: [favoriteSchema],
      default: [],
    },
  },
  { 
    /** 
     * Enable automatic timestamps (createdAt, updatedAt).
     * Provides audit trail for user account creation and modifications.
     */
    timestamps: true 
  }
);

/**
 * User model for MongoDB operations.
 * 
 * @constant {mongoose.Model<IUser>} User
 * @description
 * Compiled Mongoose model for User collection providing CRUD operations,
 * query methods, and middleware hooks. Use this model for all user-related
 * database operations.
 * 
 * @example
 * // Create a new user
 * const user = new User({
 *   firstName: "John",
 *   lastName: "Doe", 
 *   age: 25,
 *   email: "john@example.com",
 *   passwordHash: hashedPassword
 * });
 * await user.save();
 * 
 * @example
 * // Find user by email
 * const user = await User.findOne({ email: "john@example.com" });
 * 
 * @example
 * // Update user profile
 * const updatedUser = await User.findByIdAndUpdate(
 *   userId, 
 *   { firstName: "Jane" }, 
 *   { new: true }
 * );
 * 
 * @see {@link https://mongoosejs.com/docs/models.html} Mongoose Models Documentation
 */
export const User = mongoose.model<IUser>("User", userSchema);
