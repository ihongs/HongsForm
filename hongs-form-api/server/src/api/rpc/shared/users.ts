import { createHash, randomBytes } from 'node:crypto';
import { createToken } from '../../../utils/auth.js';
import { RpcContext } from '../core/types.js';
import { roster } from '../../../utils/roster.js';
import { captchaServer } from '../../../utils/captcha.js';
import { sendEmail, generateVerificationCode as generateEmailCode } from '../../../utils/email.js';
import { sendSms, generateVerificationCode as generateSmsCode } from '../../../utils/sms.js';
import { loadEnv } from '../../../utils/env.js';

const env = loadEnv();
const VERIFY_CODE_TTL = 5 * 60; // 5分钟

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

export async function generateCaptchaOrdeal(): Promise<any> {
  return await captchaServer.generateOrdeal();
}

export async function verifyCaptcha(params: Record<string, unknown>): Promise<any> {
  const { answer } = params as { answer: any };
  if (!answer) throw new Error('Answer is required');
  return await captchaServer.verify(answer);
}

export async function sendEmailVerificationCode(params: Record<string, unknown>, ctx: RpcContext): Promise<{ success: boolean }> {
  const { email, type, captchaAnswer } = params as { email: string; type?: string; captchaAnswer?: any };
  if (!email) throw new Error('Email is required');

  if (captchaAnswer) {
    const captchaResult = await captchaServer.verify(captchaAnswer);
    if (!captchaResult.success) {
      throw new Error('Captcha verification failed');
    }
  }

  const code = generateEmailCode();
  const key = `verify:email:${type || 'login'}:${email}`;
  await roster.set(key, { code, email }, VERIFY_CODE_TTL);

  const subject = '验证码';
  const html = `<p>您的验证码是：<strong>${code}</strong></p><p>验证码5分钟内有效</p>`;
  await sendEmail(email, subject, html);

  return { success: true };
}

export async function sendSmsVerificationCode(params: Record<string, unknown>, ctx: RpcContext): Promise<{ success: boolean }> {
  const { phone, type, captchaAnswer } = params as { phone: string; type?: string; captchaAnswer?: any };
  if (!phone) throw new Error('Phone is required');

  if (captchaAnswer) {
    const captchaResult = await captchaServer.verify(captchaAnswer);
    if (!captchaResult.success) {
      throw new Error('Captcha verification failed');
    }
  }

  const code = generateSmsCode();
  const key = `verify:phone:${type || 'login'}:${phone}`;
  await roster.set(key, { code, phone }, VERIFY_CODE_TTL);

  await sendSms(phone, 'verification_code', { code });

  return { success: true };
}

export async function loginOrRegisterByEmail(params: Record<string, unknown>, ctx: RpcContext): Promise<{ token: string; user: any; isNew: boolean }> {
  const { email, code } = params as { email: string; code: string };
  if (!email) throw new Error('Email is required');
  if (!code) throw new Error('Code is required');

  const key = `verify:email:login:${email}`;
  const stored = await roster.get(key);
  if (!stored || stored.code !== code) throw new Error('Invalid verification code');

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

  // 删除验证码
  await roster.delete(key);

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

  const key = `verify:phone:login:${phone}`;
  const stored = await roster.get(key);
  if (!stored || stored.code !== code) throw new Error('Invalid verification code');

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

  // 删除验证码
  await roster.delete(key);

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
