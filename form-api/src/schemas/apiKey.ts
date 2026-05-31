import { z } from 'zod';

export const apiKeySchema = z.object({
  name: z.string().optional(),
  type: z.enum(['apiKey']).default('apiKey'),
  expiresAt: z.string().datetime().optional().nullable()
});

export const apiKeyCreateSchema = apiKeySchema.pick({
  name: true
});

export const apiKeyDeleteSchema = z.object({
  id: z.string()
});