import mongoose from 'mongoose';
import { AgentMessage } from '../types';

export interface IThread {
  slug: string;
  title: string;
  description?: string;
  agent_id: string;
  messages?: AgentMessage[];
}

const ThreadSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      min: 3,
      max: 32,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      min: 3,
      trim: true,
    },
    agent_id: {
      type: String,
      required: true,
      trim: true,
    },
    messages: {
      type: Array,
      trim: true,
    },
    description: {
      type: String,
      min: 3,
      trim: true,
    },
  },
  { timestamps: true }
);

ThreadSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// To ensure virtual fields are serialized.
ThreadSchema.set('toJSON', {
  virtuals: true,
  transform(doc, ret, options) {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Thread', ThreadSchema);
