import { registerAdminMethod } from '../registry.js';
import { getDb } from '../../../../../utils/db.js';
import { hashPassword, generateSalt } from '../../../shared/users.js';

registerAdminMethod('mine.updateNickname', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;
  const { nickname } = params as any;

  if (!nickname || nickname.trim().length === 0) {
    throw new Error('昵称不能为空');
  }

  if (nickname.length > 50) {
    throw new Error('昵称不能超过 50 个字符');
  }

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
  const { avatar } = params as any;

  if (!avatar || avatar.trim().length === 0) {
    throw new Error('头像地址不能为空');
  }

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
  const { oldPassword, newPassword } = params as any;

  if (!oldPassword || !newPassword) {
    throw new Error('旧密码和新密码都不能为空');
  }

  if (newPassword.length < 6) {
    throw new Error('新密码长度不能少于 6 位');
  }

  const user = await db.collection('users').findOne({
    _id: userId,
    deletedAt: null
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  const oldHash = hashPassword(oldPassword, user.passsalt);
  if (oldHash !== user.password) {
    throw new Error('旧密码不正确');
  }

  const passsalt = generateSalt();
  const passwordHash = hashPassword(newPassword, passsalt);

  const result = await db.collection('users').updateOne(
    { _id: userId },
    {
      $set: {
        password: passwordHash,
        passsalt,
        updatedAt: new Date()
      }
    }
  );

  return { success: true };
});

registerAdminMethod('mine.updateAccount', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;
  const { account } = params as any;

  if (!account || account.trim().length === 0) {
    throw new Error('账号不能为空');
  }

  if (account.length > 50) {
    throw new Error('账号不能超过 50 个字符');
  }

  const existing = await db.collection('users').findOne({
    username: account.trim(),
    _id: { $ne: userId },
    deletedAt: null
  });

  if (existing) {
    throw new Error('该账号已被使用');
  }

  const result = await db.collection('users').updateOne(
    { _id: userId, deletedAt: null },
    {
      $set: {
        username: account.trim(),
        updatedAt: new Date()
      }
    }
  );

  if (result.matchedCount === 0) {
    throw new Error('用户不存在');
  }

  return { success: true };
});

registerAdminMethod('mine.bindPhone', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;
  const { phone, verifyCode } = params as any;

  if (!phone) {
    throw new Error('手机号不能为空');
  }

  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    throw new Error('手机号格式不正确');
  }

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
  const { email } = params as any;

  if (!email) {
    throw new Error('邮箱不能为空');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('邮箱格式不正确');
  }

  const existing = await db.collection('users').findOne({
    email,
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
        email: email.toLowerCase().trim(),
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
    { _id: userId, deletedAt: null },
    {
      projection: {
        password: 0,
        passsalt: 0,
        deletedAt: 0,
        createdAt: 0,
        updatedAt: 0
      }
    }
  );

  if (!user) {
    throw new Error('用户不存在');
  }

  return {
    _id: user._id.toString(),
    account: user.username || '',
    nickname: user.nickname || '',
    avatar: user.avatar || '',
    phone: user.phone || '',
    email: user.email || '',
    role: user.role || 'user'
  };
});