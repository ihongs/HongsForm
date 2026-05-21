import { ObjectId } from 'mongodb';
import { SHA256, enc } from 'crypto-js';
import { registerMethod } from '../index.js';
import { getDb } from '../../utils/db.js';

// 生成随机盐
function generateSalt(): string {
  return Math.random().toString(36).slice(2, 10);
}

// 密码哈希
function hashPassword(password: string, salt: string): string {
  return SHA256(password + salt).toString(enc.Hex);
}

// 用户列表
registerMethod('user.list', async (params, ctx) => {
  const { page = 1, pageSize = 20, keyword = '' } = params as any;
  const skip = (page - 1) * pageSize;

  const query: any = { deletedAt: null };
  if (keyword) {
    query.$or = [
      { username: { $regex: keyword, $options: 'i' } },
      { nickname: { $regex: keyword, $options: 'i' } },
      { email: { $regex: keyword, $options: 'i' } }
    ];
  }

  const [items, total] = await Promise.all([
    ctx.db.collection('user')
      .find(query)
      .project({ password: 0, passsalt: 0 })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray(),
    ctx.db.collection('user').countDocuments(query)
  ]);

  return { items, total, page, pageSize };
});

// 获取用户
registerMethod('user.get', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('User ID is required');

  const user = await ctx.db.collection('user').findOne(
    { _id: new ObjectId(id), deletedAt: null },
    { projection: { password: 0, passsalt: 0 } }
  );

  if (!user) throw new Error('User not found');
  return user;
});

// 创建用户
registerMethod('user.create', async (params, ctx) => {
  const { username, password, role = 'agent', nickname, email, phone } = params as any;
  if (!username) throw new Error('Username is required');
  if (!password) throw new Error('Password is required');

  const exists = await ctx.db.collection('user').findOne({ username, deletedAt: null });
  if (exists) throw new Error('Username already exists');

  const passsalt = generateSalt();
  const passwordHash = hashPassword(password, passsalt);

  const now = new Date();
  const result = await ctx.db.collection('user').insertOne({
    username,
    password: passwordHash,
    passsalt,
    role,
    nickname: nickname || username,
    email: email || null,
    phone: phone || null,
    avatar: null,
    status: 1,
    settings: {},
    lastLoginIp: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });

  return { id: result.insertedId.toString() };
});

// 更新用户
registerMethod('user.update', async (params, ctx) => {
  const { id, ...updateData } = params as any;
  if (!id) throw new Error('User ID is required');

  // 不允许直接修改密码
  delete updateData.password;
  delete updateData.passsalt;

  updateData.updatedAt = new Date();

  const result = await ctx.db.collection('user').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: updateData }
  );

  if (result.matchedCount === 0) throw new Error('User not found');
  return { success: true };
});

// 修改密码
registerMethod('user.changePassword', async (params, ctx) => {
  const { id, oldPassword, newPassword } = params as any;
  if (!id) throw new Error('User ID is required');
  if (!oldPassword) throw new Error('Old password is required');
  if (!newPassword) throw new Error('New password is required');

  const user = await ctx.db.collection('user').findOne({ _id: new ObjectId(id), deletedAt: null });
  if (!user) throw new Error('User not found');

  const oldHash = hashPassword(oldPassword, user.passsalt);
  if (oldHash !== user.password) throw new Error('Old password is incorrect');

  const passsalt = generateSalt();
  const passwordHash = hashPassword(newPassword, passsalt);

  await ctx.db.collection('user').updateOne(
    { _id: new ObjectId(id) },
    { $set: { password: passwordHash, passsalt, updatedAt: new Date() } }
  );

  return { success: true };
});

// 删除用户
registerMethod('user.delete', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('User ID is required');

  const result = await ctx.db.collection('user').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) throw new Error('User not found');
  return { success: true };
});

// 用户登录
registerMethod('user.login', async (params, ctx) => {
  const { username, password } = params as any;
  if (!username) throw new Error('Username is required');
  if (!password) throw new Error('Password is required');

  const user = await ctx.db.collection('user').findOne({ username, deletedAt: null });
  if (!user) throw new Error('User not found');

  if (user.status !== 1) throw new Error('User is disabled');

  const passwordHash = hashPassword(password, user.passsalt);
  if (passwordHash !== user.password) throw new Error('Invalid password');

  // 记录登录信息
  await ctx.db.collection('user').updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
  );

  // 返回用户信息（排除敏感字段）
  const { password: _, passsalt: __, ...userInfo } = user;
  return userInfo;
});
