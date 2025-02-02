import 'dotenv/config';
import { parseEnv, port, z } from 'znv';

export const {
  PORT,
  MONGO_URL,
  EMBED_MODEL,
  AUTOMATION_ORGID,
  AUTOMATION_AUTHTOKEN,
  AUTOMATION_URL,
  AUTOMATION_PROJECTID,
  LLAMA_MODEL,
  ZOOM_LINK,
  OPENAI_API_KEY,
  SERPSTACK_API_KEY,
} = parseEnv(process.env, {
  MONGO_URL: {
    schema: z.string().url().default('mongodb://localhost:27017/devfest'),
    description: 'MongoDB database URL',
  },
  PORT: port().default(1337),
  EMBED_MODEL: z.string().default('nomic-embed-text'),
  AUTOMATION_ORGID: z.string(),
  AUTOMATION_AUTHTOKEN: z.string(),
  AUTOMATION_URL: z.string().url(),
  AUTOMATION_PROJECTID: z.string(),
  LLAMA_MODEL: z.string().default('llama3.3'),
  ZOOM_LINK: z.string(),
  OPENAI_API_KEY: z.string(),
  SERPSTACK_API_KEY: z.string(),
});
