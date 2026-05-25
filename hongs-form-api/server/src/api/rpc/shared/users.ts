import { createHash, randomBytes } from 'node:crypto';
import { createToken } from '../../../utils/auth.js';
import { RpcContext } from '../core/types.js';
import { roster } from '../../../utils/roster.js';

const DIFFICULTY = 4;
const EXPIRE_1H = 3600;

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

// 验证算力答案
function verifyProof(nonce: string, answer: number, difficulty: number): boolean {
  const hash = createHash('sha256').update(`${nonce}${answer}`).digest('hex');
  return hash.startsWith('0'.repeat(difficulty));
}

export async function login(params: Record<string, unknown>, role: 'agent' | 'admin' | null, ctx: RpcContext): Promise<Record<string, unknown>> {
  const { username, password, verifyToken, verifyNonce, verifyAnswer } = params as any;
  if (!username) throw new Error('Username is required');
  if (!password) throw new Error('Password is required');
  if (!verifyToken) throw new Error('Verification token is required');
  if (!verifyNonce) throw new Error('Verification nonce is required');
  if (verifyAnswer === undefined) throw new Error('Verification answer is required');

  // 立即删除 token，防止重复使用（无论登录成功与否）
  const tokenRecord = await roster.getRecordAndRemove(`verify.token.${verifyToken}`);
  if (!tokenRecord) {
    throw new Error('Verification token invalid or expired');
  }
  const tokenStatus = tokenRecord.value;
  if (tokenStatus === 1) {
    throw new Error('Verification token already used');
  }

  if (!verifyProof(verifyNonce, verifyAnswer, DIFFICULTY)) {
    throw new Error('Verification failed');
  }

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

// 生成 MD5 哈希，防止超长 key 攻击
function md5(str: string): string {
  return createHash('md5').update(str).digest('hex');
}

export async function loginOrRegisterByEmail(params: Record<string, unknown>, ctx: RpcContext): Promise<{ token: string; user: any; isNew: boolean }> {
  const { email, code } = params as { email: string; code: string };
  if (!email) throw new Error('Email is required');
  if (!code) throw new Error('Code is required');

  const emailMd5 = md5(email);
  const key = `verify.email.code.${emailMd5}`;
  const storedCode = await roster.getAndRemove(key);
  if (!storedCode || storedCode !== code) throw new Error('Invalid verification code');

  // 检查用户
  const users = await ctx.db.collection('user').find({ email, deletedAt: null }).toArray();
  if (users.length > 1) throw new Error('Multiple users found with this email, please contact admin');

  let user = users[0];
  let isNew = false;

  if (user) {
    if (user.role !== 'agent') throw new Error('User is not agent, please contact admin');
    if (user.status !== 1) throw new Error('User is disabled');
  } else {
    // 创建新用户
    const salt = generateSalt();
    const randomPassword = randomBytes(16).toString('hex');
    const now = new Date();
    const result = await ctx.db.collection('user').insertOne({
      username: email,
      email,
      password: hashPassword(randomPassword, salt),
      passsalt: salt,
      role: 'agent',
      status: 1,
      settings: {},
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    });
    const newUser = await ctx.db.collection('user').findOne({ _id: result.insertedId });
    if (!newUser) throw new Error('Failed to create user');
    user = newUser;
    isNew = true;
  }

  const now = new Date();
  const token = createToken({ sub: user._id.toString(), role: user.role });

  await ctx.db.collection('user').updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: now, updatedAt: now } }
  );

  return {
    token,
    user: toSafeUser(user),
    isNew
  };
}

export async function loginOrRegisterByPhone(params: Record<string, unknown>, ctx: RpcContext): Promise<{ token: string; user: any; isNew: boolean }> {
  const { phone, code } = params as { phone: string; code: string };
  if (!phone) throw new Error('Phone is required');
  if (!code) throw new Error('Code is required');

  const phoneMd5 = md5(phone);
  const key = `verify.sms.code.${phoneMd5}`;
  const storedCode = await roster.getAndRemove(key);
  if (!storedCode || storedCode !== code) throw new Error('Invalid verification code');

  // 检查用户
  const users = await ctx.db.collection('user').find({ phone, deletedAt: null }).toArray();
  if (users.length > 1) throw new Error('Multiple users found with this phone, please contact admin');

  let user = users[0];
  let isNew = false;

  if (user) {
    if (user.role !== 'agent') throw new Error('User is not agent, please contact admin');
    if (user.status !== 1) throw new Error('User is disabled');
  } else {
    // 创建新用户
    const salt = generateSalt();
    const randomPassword = randomBytes(16).toString('hex');
    const now = new Date();
    const result = await ctx.db.collection('user').insertOne({
      username: phone,
      phone,
      password: hashPassword(randomPassword, salt),
      passsalt: salt,
      role: 'agent',
      status: 1,
      settings: {},
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    });
    const newUser = await ctx.db.collection('user').findOne({ _id: result.insertedId });
    if (!newUser) throw new Error('Failed to create user');
    user = newUser;
    isNew = true;
  }

  const now = new Date();
  const token = createToken({ sub: user._id.toString(), role: user.role });

  await ctx.db.collection('user').updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: now, updatedAt: now } }
  );

  return {
    token,
    user: toSafeUser(user),
    isNew
  };
}
