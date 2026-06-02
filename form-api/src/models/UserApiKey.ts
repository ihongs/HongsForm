import { Db, ObjectId } from 'mongodb';
import { z } from 'zod';
import { BaseModel } from './BaseModel.js';
import { toFindSchema } from '../utils/finder.js';

export const UserApiKeySchema = z.object({
  userId: z.custom<ObjectId>((val) => val instanceof ObjectId),
  type: z.enum(['apiKey']).default('apiKey'),
  name: z.string().optional().nullable(),
  sk: z.string(),
  expiresAt: z.date().optional().nullable(),
});

export const UserApiKeyCreateSchema = UserApiKeySchema;
export const UserApiKeyUpdateSchema = UserApiKeySchema.partial().omit({ userId: true, sk: true });

export const UserApiKeyFindSchema = toFindSchema(UserApiKeySchema, ['userId', 'type', 'name', 'expiresAt']);

export class UserApiKeyModel extends BaseModel {
  constructor(db: Db) {
    super(db, 'userApiKeys', {
      createSchema: UserApiKeyCreateSchema,
      updateSchema: UserApiKeyUpdateSchema,
      findSchema: UserApiKeyFindSchema,
    });
  }
}
