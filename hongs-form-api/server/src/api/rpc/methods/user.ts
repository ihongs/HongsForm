import { ObjectId } from 'mongodb';
import { createHash, randomBytes } from 'node:crypto';
import { registerAdminMethod, registerAgentMethod } from '../registry.js';
import { createToken } from '../../../utils/auth.js';

function generateSalt(): string {
  return randomBytes(16).toString('hex');
}

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(password + salt).digest('hex');
}

function toSafeUser(user: any): Record<string, unknown> {
  const { password: _password, passsalt: _passsalt, ...userInfo } = user;
  return userInfo;
}

async function login(params: Record<string, unknown>, role: 'agent' | 'admin' | null, ctx: any): Promise<Record<string, unknown>> {
  const { username, password } = params as any;
  if (!username) throw new Error('Username is required');
  if (!password) throw new Error('Password is required');

  const user = await ctx.db.collection('user').findOne({ username, deletedAt: null });
  if (!user) throw new Error('User not found');
  if (role && user.role !== role) throw new Error('Forbidden');
  if (user.status !== 1) throw new Error('User is disabled');

  const passwordHash = hashPassword(password, user.passsalt);
  if (passwordHash !== user.password) throw new Error('Invalid password');

  await ctx.db.collection('user').updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
  );

  return {
    token: createToken({ sub: user._id.toString(), role: user.role }),
    user: toSafeUser(user)
  };
}

registerAgentMethod('agent.login', async (params, ctx) => login(params, 'agent', ctx));
registerAdminMethod('admin.login', async (params, ctx) => login(params, 'admin', ctx));

registerAdminMethod('admin.user.list', async (params, ctx) => {
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

registerAdminMethod('admin.user.get', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('User ID is required');

  const user = await ctx.db.collection('user').findOne(
    { _id: new ObjectId(id), deletedAt: null },
    { projection: { password: 0, passsalt: 0 } }
  );

  if (!user) throw new Error('User not found');
  return user;
});

registerAdminMethod('admin.user.create', async (params, ctx) => {
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

registerAdminMethod('admin.user.update', async (params, ctx) => {
  const { id, ...updateData } = params as any;
  if (!id) throw new Error('User ID is required');

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

registerAdminMethod('admin.user.changePassword', async (params, ctx) => {
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
    { _id: user._id },
    { $set: { password: passwordHash, passsalt, updatedAt: new Date() } }
  );

  return { success: true };
});

registerAdminMethod('admin.user.delete', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('User ID is required');

  const result = await ctx.db.collection('user').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) throw new Error('User not found');
  return { success: true };
});
