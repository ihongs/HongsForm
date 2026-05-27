import { ObjectId } from 'mongodb';
import { registerAdminMethod } from '../registry.js';
import { generateSalt, hashPassword } from '../../../shared/users.js';

registerAdminMethod('user.list', async (params, ctx) => {
  const { page = 1, pageSize = 20, keyword = '', status } = params as any;
  const skip = (page - 1) * pageSize;

  const query: any = { deletedAt: null };
  if (status !== undefined && status !== '') query.status = Number(status);
  if (keyword) {
    query.$or = [
      { username: { $regex: keyword, $options: 'i' } },
      { nickname: { $regex: keyword, $options: 'i' } },
      { email: { $regex: keyword, $options: 'i' } },
      { phone: { $regex: keyword, $options: 'i' } }
    ];
  }

  const [items, total] = await Promise.all([
    ctx.db.collection('users')
      .find(query)
      .project({ password: 0, passsalt: 0 })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray(),
    ctx.db.collection('users').countDocuments(query)
  ]);

  return { items, total, page, pageSize };
});

registerAdminMethod('user.get', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('User ID is required');

  const user = await ctx.db.collection('users').findOne(
    { _id: new ObjectId(id), deletedAt: null },
    { projection: { password: 0, passsalt: 0 } }
  );

  if (!user) throw new Error('User not found');
  return user;
});

registerAdminMethod('user.create', async (params, ctx) => {
  const { username, password, role = 'agent', nickname, email, phone } = params as any;
  if (!username) throw new Error('Username is required');
  if (!password) throw new Error('Password is required');

  const exists = await ctx.db.collection('users').findOne({ username, deletedAt: null });
  if (exists) throw new Error('Username already exists');

  const passsalt = generateSalt();
  const passwordHash = hashPassword(password, passsalt);

  const now = new Date();
  const result = await ctx.db.collection('users').insertOne({
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

registerAdminMethod('user.update', async (params, ctx) => {
  const { id, password, ...updateData } = params as any;
  if (!id) throw new Error('User ID is required');

  delete updateData.passsalt;

  updateData.updatedAt = new Date();

  if (password) {
    const passsalt = generateSalt();
    updateData.password = hashPassword(password, passsalt);
    updateData.passsalt = passsalt;
  }

  const result = await ctx.db.collection('users').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: updateData }
  );

  if (result.matchedCount === 0) throw new Error('User not found');
  return { success: true };
});

registerAdminMethod('user.changePassword', async (params, ctx) => {
  const { id, oldPassword, newPassword } = params as any;
  if (!id) throw new Error('User ID is required');
  if (!oldPassword) throw new Error('Old password is required');
  if (!newPassword) throw new Error('New password is required');

  const user = await ctx.db.collection('users').findOne({ _id: new ObjectId(id), deletedAt: null });
  if (!user) throw new Error('User not found');

  const oldHash = hashPassword(oldPassword, user.passsalt);
  if (oldHash !== user.password) throw new Error('Old password is incorrect');

  const passsalt = generateSalt();
  const passwordHash = hashPassword(newPassword, passsalt);

  await ctx.db.collection('users').updateOne(
    { _id: user._id },
    { $set: { password: passwordHash, passsalt, updatedAt: new Date() } }
  );

  return { success: true };
});

registerAdminMethod('user.delete', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('User ID is required');

  const result = await ctx.db.collection('users').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) throw new Error('User not found');
  return { success: true };
});
