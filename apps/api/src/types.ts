import { z } from 'zod';

export const AgentMessageClass = z.object({
  content: z.string({
    required_error: 'Content is required.',
  }),
  role: z.enum(['user', 'agent', 'system'], {
    required_error: 'Role is required.',
  }),
});

export type AgentMessage = z.infer<typeof AgentMessageClass>;
