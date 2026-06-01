import { createHash, randomBytes } from 'node:crypto';
import { createToken } from '../../../utils/auth.js';
import { RpcContext } from '../core/types.js';
import { roster } from '../../../utils/roster.js';
import { verifyProofObject } from '../../../utils/verify.js';

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
  const { username, password, verify } = params as any;
  if (!username) throw new Error('Username is required');
  if (!password) throw new Error('Password is required');

  // 验证 verify 对象
  await verifyProofObject(verify);

  const user = await ctx.db.collection('users').findOne({ username, deletedAt: null });
  if (!user) throw new Error('User not found');
  if (role && !user.roles?.includes(role)) throw new Error('Forbidden');
  if (user.status !== 1) throw new Error('User is disabled');

  const passwordHash = hashPassword(password, user.passsalt);
  if (passwordHash !== user.password) throw new Error('Invalid password');

  const now = new Date();
  const token = createToken({ sub: user._id.toString(), roles: user.roles });

  await ctx.db.collection('users').updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: now, updatedAt: now } }
  );

  return {
    token,
    user: toSafeUser(user)
  };
}

// 生成 MD5 哈希，防止超长 key 攻击
function md5(str: string): string {
  return createHash('md5').update(str).digest('hex');
}

export async function loginByEmail(params: Record<string, unknown>, ctx: RpcContext): Promise<{ token: string; user: any }> {
  const { email, code } = params as { email: string; code: string };
  if (!email) throw new Error('Email is required');
  if (!code) throw new Error('Code is required');

  const emailMd5 = md5(email);
  const key = `verify.email.code.${emailMd5}`;
  const storedCode = await roster.getAndRemove(key);
  if (!storedCode || storedCode !== code) throw new Error('Invalid verification code');

  const users = await ctx.db.collection('users').find({ email, deletedAt: null }).toArray();
  if (users.length > 1) throw new Error('Multiple users found with this email, please contact admin');

  const user = users[0];
  if (!user) throw new Error('User not found, please register first');
  if (!user.roles?.includes('agent')) throw new Error('User is not agent, please contact admin');
  if (user.status !== 1) throw new Error('User is disabled');

  const now = new Date();
  const token = createToken({ sub: user._id.toString(), roles: user.roles });

  await ctx.db.collection('users').updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: now, updatedAt: now } }
  );

  return {
    token,
    user: toSafeUser(user)
  };
}

export async function loginByPhone(params: Record<string, unknown>, ctx: RpcContext): Promise<{ token: string; user: any }> {
  const { phone, code } = params as { phone: string; code: string };
  if (!phone) throw new Error('Phone is required');
  if (!code) throw new Error('Code is required');

  const phoneMd5 = md5(phone);
  const key = `verify.sms.code.${phoneMd5}`;
  const storedCode = await roster.getAndRemove(key);
  if (!storedCode || storedCode !== code) throw new Error('Invalid verification code');

  const users = await ctx.db.collection('users').find({ phone, deletedAt: null }).toArray();
  if (users.length > 1) throw new Error('Multiple users found with this phone, please contact admin');

  const user = users[0];
  if (!user) throw new Error('User not found, please register first');
  if (!user.roles?.includes('agent')) throw new Error('User is not agent, please contact admin');
  if (user.status !== 1) throw new Error('User is disabled');

  const now = new Date();
  const token = createToken({ sub: user._id.toString(), roles: user.roles });

  await ctx.db.collection('users').updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: now, updatedAt: now } }
  );

  return {
    token,
    user: toSafeUser(user)
  };
}

export async function registerByEmail(params: Record<string, unknown>, ctx: RpcContext): Promise<{ token: string; user: any }> {
  const { email, code, nickname, avatar } = params as { email: string; code: string; nickname?: string; avatar?: string };
  if (!email) throw new Error('Email is required');
  if (!code) throw new Error('Code is required');

  const emailMd5 = md5(email);
  const key = `verify.email.code.${emailMd5}`;
  const storedCode = await roster.getAndRemove(key);
  if (!storedCode || storedCode !== code) throw new Error('Invalid verification code');

  const existingUsers = await ctx.db.collection('users').find({ email, deletedAt: null }).toArray();
  if (existingUsers.length > 0) throw new Error('Email already registered, please login');

  const salt = generateSalt();
  const randomPassword = randomBytes(16).toString('hex');
  const now = new Date();
  const result = await ctx.db.collection('users').insertOne({
    username: email,
    email,
    nickname: nickname || '',
    avatar: avatar || '',
    password: hashPassword(randomPassword, salt),
    passsalt: salt,
    roles: ['agent'],
    status: 1,
    settings: {},
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });

  const user = await ctx.db.collection('users').findOne({ _id: result.insertedId });
  if (!user) throw new Error('Failed to create user');

  const token = createToken({ sub: user._id.toString(), roles: user.roles });

  return {
    token,
    user: toSafeUser(user)
  };
}

export async function registerByPhone(params: Record<string, unknown>, ctx: RpcContext): Promise<{ token: string; user: any }> {
  const { phone, code, nickname, avatar } = params as { phone: string; code: string; nickname?: string; avatar?: string };
  if (!phone) throw new Error('Phone is required');
  if (!code) throw new Error('Code is required');

  const phoneMd5 = md5(phone);
  const key = `verify.sms.code.${phoneMd5}`;
  const storedCode = await roster.getAndRemove(key);
  if (!storedCode || storedCode !== code) throw new Error('Invalid verification code');

  const existingUsers = await ctx.db.collection('users').find({ phone, deletedAt: null }).toArray();
  if (existingUsers.length > 0) throw new Error('Phone already registered, please login');

  const salt = generateSalt();
  const randomPassword = randomBytes(16).toString('hex');
  const now = new Date();
  const result = await ctx.db.collection('users').insertOne({
    username: phone,
    phone,
    nickname: nickname || '',
    avatar: avatar || '',
    password: hashPassword(randomPassword, salt),
    passsalt: salt,
    roles: ['agent'],
    status: 1,
    settings: {},
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });

  const user = await ctx.db.collection('users').findOne({ _id: result.insertedId });
  if (!user) throw new Error('Failed to create user');

  const token = createToken({ sub: user._id.toString(), roles: user.roles });

  return {
    token,
    user: toSafeUser(user)
  };
}
