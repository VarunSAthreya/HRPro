import mongoose from 'mongoose';

const agentProvider = ['openai', 'gemini'];
const agentResponseType = ['text', 'json'];

export enum AgentProvider {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  LLAMA = 'llama',
}

export enum AgentResponseType {
  TEXT = 'text',
  JSON = 'json',
}

export const OpenAIResponseTypeMap = {
  text: 'text',
  json: 'json_object',
};

export const GeminiResponseTypeMap = {
  text: 'text/plain',
  json: 'application/json',
};

export const GeminiRoleMap = {
  user: 'user',
  assistant: 'model',
};

export const AutomateProviderMap = {
  openai: 'chatgpt',
  gemini: 'vertex',
  llama: 'chatgpt',
};

export type AbilityType = 'automation' | 'agent' | 'function';

export type Ability = {
  id: string;
  title?: string;
  type: AbilityType;
};

export interface IAgent {
  id: string;
  title: string;
  description: string;
  role_setting?: string;
  abilities: Ability[];
  auth: string;
  provider: AgentProvider;
  model: string;
  response_type: AgentResponseType;
  randomness?: number;
}

const AgentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      min: 3,
      max: 32,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      min: 3,
      max: 500,
    },
    role_setting: {
      type: String,
      required: true,
      trim: true,
      min: 3,
      max: 35000,
    },
    provider: {
      type: String,
      enum: agentProvider,
      required: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    auth: {
      type: String,
      required: true,
      trim: true,
    },
    response_type: {
      type: String,
      required: true,
      enum: agentResponseType,
    },
    randomness: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.5,
    },
    abilities: {
      type: Array<Ability>,
      default: [],
    },
  },
  { timestamps: true }
);

// To ensure virtual fields are serialized.
AgentSchema.set('toJSON', {
  virtuals: true,
  transform(doc, ret, options) {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Agent', AgentSchema);
