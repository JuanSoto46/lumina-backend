// ...existing code...
import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Interface representing a comment document in MongoDB.
 *
 * @interface IComment
 * @extends {Document}
 * @property {Types.ObjectId} user - Reference to the user who created the comment.
 * @property {string} videoId - Identifier of the associated video.
 * @property {string} content - The comment text.
 * @property {Date} createdAt - Timestamp when the comment was created (auto-generated).
 * @property {Date} updatedAt - Timestamp when the comment was last updated (auto-generated).
 */
export interface IComment extends Document {
  user: Types.ObjectId;
  videoId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose schema for Comment documents.
 *
 * Fields:
 *  - user: ObjectId (ref: "User"), required.
 *  - videoId: string, required.
 *  - content: string, required.
 *
 * Options:
 *  - timestamps: true -> automatically adds createdAt and updatedAt fields.
 */
const commentSchema = new Schema<IComment>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    videoId: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

/**
 * Mongoose model for Comment.
 *
 * @type {import("mongoose").Model<IComment>}
 */
export const Comment = mongoose.model<IComment>("Comment", commentSchema);
