import { createHash, randomBytes } from 'node:crypto';
import { createToken } from '../../../utils/auth.js';
import { RpcContext } from '../core/types.js';

export function generateSalt(): string {
  return randomBytes(16).toString('hex');
}

export function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(password + salt).digest('hex');
}

export function toSafeUser(user: any): Record<string, unknown> {
  const { password: _password, passsalt: _passsalt, ...userInfo } = user;
  return userInfo;
}

export async function login(params: Record<string, unknown>, role: 'agent' | 'admin' | null, ctx: RpcContext): Promise<Record<string, unknown>> {
  const { username, password } = params as any;
  if (!username) throw new Error('Username is required');
  if (!password) throw new Error('Password is required');

  const user = await ctx.db.collection('user').findOne({ username, deletedAt: null });
  if (!user) throw new Error('User not found');
  if (role && user.role !== role) throw new Error('Forbidden');
  if (user.status !== 1) throw new Error('User is disabled');

  const passwordHash = hashPassword(password, user.passsalt);
  if (passwordHash !== user.password) throw new Error('Invalid password');

  const now = new Date();
  const token = createToken({ sub: user._id.toString(), role: user.role });

  await ctx.db.collection('user').updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: now, updatedAt: now } }
  );

  return {
    token,
    user: toSafeUser(user)
  };
}
