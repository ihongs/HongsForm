import { registerAdminMethod } from '../registry.js';
import { getDb } from '../../../../../utils/db.js';
import { hashPassword, generateSalt } from '../../../shared/users.js';
import { verifyProofObject } from '../../../../../utils/verify.js';
import { z } from 'zod';

const updateNicknameSchema = z.object({
  nickname: z.string().min(1).max(50)
});

const updateAvatarSchema = z.object({
  avatar: z.string().min(1)
});

const updatePasswordSchema = z.object({
  oldPassword: z.string().optional(),
  newPassword: z.string().min(6),
  username: z.string().max(50).optional(),
  verify: z.object({
    token: z.string(),
    nonce: z.string(),
    answer: z.number()
  })
});

const bindPhoneSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确')
});

const bindEmailSchema = z.object({
  email: z.string().email()
});

registerAdminMethod('mine.updateNickname', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;
  
  const { nickname } = updateNicknameSchema.parse(params);

  const result = await db.collection('users').updateOne(
    { _id: userId, deletedAt: null },
    {
      $set: {
        nickname: nickname.trim(),
        updatedAt: new Date()
      }
    }
  );

  if (result.matchedCount === 0) {
    throw new Error('用户不存在');
  }

  return { success: true };
});

registerAdminMethod('mine.updateAvatar', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;
  
  const { avatar } = updateAvatarSchema.parse(params);

  const result = await db.collection('users').updateOne(
    { _id: userId, deletedAt: null },
    {
      $set: {
        avatar: avatar.trim(),
        updatedAt: new Date()
      }
    }
  );

  if (result.matchedCount === 0) {
    throw new Error('用户不存在');
  }

  return { success: true };
});

registerAdminMethod('mine.updatePassword', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;
  
  const { oldPassword, newPassword, username, verify } = updatePasswordSchema.parse(params);

  await verifyProofObject(verify);

  const user = await db.collection('users').findOne({
    _id: userId,
    deletedAt: null
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  if (user.password) {
    if (!oldPassword) {
      throw new Error('旧密码不能为空');
    }
    const oldHash = hashPassword(oldPassword, user.passsalt);
    if (oldHash !== user.password) {
      throw new Error('旧密码不正确');
    }
  }

  if (username && username.trim().length > 0) {
    const existing = await db.collection('users').findOne({
      username: username.trim(),
      _id: { $ne: userId },
      deletedAt: null
    });

    if (existing) {
      throw new Error('该用户名已被使用');
    }
  }

  const passsalt = generateSalt();
  const passwordHash = hashPassword(newPassword, passsalt);

  const updateData: any = {
    password: passwordHash,
    passsalt,
    updatedAt: new Date()
  };

  if (username && username.trim().length > 0) {
    updateData.username = username.trim();
  }

  await db.collection('users').updateOne(
    { _id: userId },
    { $set: updateData }
  );

  return { success: true };
});

registerAdminMethod('mine.bindPhone', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;
  
  const { phone } = bindPhoneSchema.parse(params);

  const existing = await db.collection('users').findOne({
    phone,
    _id: { $ne: userId },
    deletedAt: null
  });

  if (existing) {
    throw new Error('该手机号已被绑定');
  }

  const result = await db.collection('users').updateOne(
    { _id: userId, deletedAt: null },
    {
      $set: {
        phone,
        updatedAt: new Date()
      }
    }
  );

  if (result.matchedCount === 0) {
    throw new Error('用户不存在');
  }

  return { success: true };
});

registerAdminMethod('mine.unbindPhone', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;

  const user = await db.collection('users').findOne({
    _id: userId,
    deletedAt: null
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  let loginMethods = 0;
  if (user.username && user.password) loginMethods++;
  if (user.phone) loginMethods++;
  if (user.email) loginMethods++;

  if (loginMethods <= 1) {
    throw new Error('解绑手机将无法登录，请先设置其他登录方式后再解绑');
  }

  const result = await db.collection('users').updateOne(
    { _id: userId, deletedAt: null },
    {
      $set: {
        phone: null,
        updatedAt: new Date()
      }
    }
  );

  if (result.matchedCount === 0) {
    throw new Error('用户不存在');
  }

  return { success: true };
});

registerAdminMethod('mine.bindEmail', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;
  
  const { email } = bindEmailSchema.parse(params);
  const emailLower = email.toLowerCase().trim();

  const existing = await db.collection('users').findOne({
    email: emailLower,
    _id: { $ne: userId },
    deletedAt: null
  });

  if (existing) {
    throw new Error('该邮箱已被绑定');
  }

  const result = await db.collection('users').updateOne(
    { _id: userId, deletedAt: null },
    {
      $set: {
        email: emailLower,
        updatedAt: new Date()
      }
    }
  );

  if (result.matchedCount === 0) {
    throw new Error('用户不存在');
  }

  return { success: true };
});

registerAdminMethod('mine.unbindEmail', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;

  const user = await db.collection('users').findOne({
    _id: userId,
    deletedAt: null
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  let loginMethods = 0;
  if (user.username && user.password) loginMethods++;
  if (user.phone) loginMethods++;
  if (user.email) loginMethods++;

  if (loginMethods <= 1) {
    throw new Error('解绑邮箱将无法登录，请先设置其他登录方式后再解绑');
  }

  const result = await db.collection('users').updateOne(
    { _id: userId, deletedAt: null },
    {
      $set: {
        email: null,
        updatedAt: new Date()
      }
    }
  );

  if (result.matchedCount === 0) {
    throw new Error('用户不存在');
  }

  return { success: true };
});

registerAdminMethod('mine.getProfile', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;

  const user = await db.collection('users').findOne(
    { _id: userId, deletedAt: null }
  );

  if (!user) {
    throw new Error('用户不存在');
  }

  return {
    _id: user._id.toString(),
    account: user.username || '',
    nickname: user.nickname || '',
    avatar: user.avatar || '',
    hasPassword: !!user.password,
    phone: user.phone || '',
    email: user.email || '',
    roles: user.roles || []
  };
});
