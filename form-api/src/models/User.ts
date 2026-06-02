import { Db, ObjectId } from 'mongodb';
import { z } from 'zod';
import { BaseModel } from './BaseModel.js';
import { toFindSchema } from '../utils/finder.js';

export const UserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  passsalt: z.string().optional(),
  nickname: z.string().optional(),
  avatar: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  roles: z.array(z.enum(['admin', 'agent'])).default(['agent']),
  status: z.number().int().min(0).max(2).default(1),
  lastLoginIp: z.string().optional().nullable(),
  lastLoginAt: z.date().optional().nullable(),
});

export const UserCreateSchema = UserSchema.omit({
  lastLoginIp: true,
  lastLoginAt: true,
});

export const UserUpdateSchema = UserSchema.partial();

export const UserFindSchema = toFindSchema(UserSchema, ['username', 'email', 'phone', 'roles', 'status']);

export class UserModel extends BaseModel {
  constructor(db: Db) {
    super(db, 'users', {
      createSchema: UserCreateSchema,
      updateSchema: UserUpdateSchema,
      findSchema: UserFindSchema,
    });
  }
}
