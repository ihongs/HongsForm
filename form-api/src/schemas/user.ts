import { z } from 'zod';

export const userSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  roles: z.array(z.enum(['admin', 'agent'])).default(['agent']),
  nickname: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional().nullable(),
  status: z.number().int().min(0).max(2).optional(),
  settings: z.record(z.string(), z.any()).optional(),
  lastLoginIp: z.string().optional().nullable(),
  lastLoginAt: z.string().datetime().optional().nullable()
});

export const userCreateSchema = userSchema.pick({
  username: true,
  password: true,
  roles: true,
  nickname: true,
  email: true,
  phone: true
});

export const userUpdateSchema = userSchema.partial().extend({
  id: z.string()
});

export const userChangePasswordSchema = z.object({
  id: z.string(),
  oldPassword: z.string(),
  newPassword: z.string().min(6)
});