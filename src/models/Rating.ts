import mongoose, { Schema, Document } from "mongoose";

/**
 * Interface representing a rating document in MongoDB.
 *
 * @interface IRating
 * @extends {Document}
 * @property {string} userId - Identifier of the user who created the rating
 * @property {string} videoId - Identifier of the rated video
 * @property {number} rating - Rating value between 0 and 5
 * @property {Date} createdAt - Timestamp when rating was created (auto-generated)
 * @property {Date} updatedAt - Timestamp when rating was last updated (auto-generated)
 */
export interface IRating extends Document {
  userId: string;
  videoId: string;
  rating: number;
}

/**
 * Mongoose schema for Rating documents.
 *
 * Fields:
 *  - userId: string, required
 *  - videoId: string, required
 *  - rating: number, required, range: 0-5
 *
 * Options:
 *  - timestamps: true -> automatically adds createdAt and updatedAt fields
 */
const ratingSchema = new Schema<IRating>(
  {
    userId: { type: String, required: true },
    videoId: { type: String, required: true },
    rating: { type: Number, required: true, min: 0, max: 5 },
  },
  { timestamps: true }
);

/**
 * Mongoose model for Rating.
 * 
 * @type {import("mongoose").Model<IRating>}
 */
export const Rating = mongoose.model<IRating>("Rating", ratingSchema);