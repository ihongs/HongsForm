import { registerAdminMethod } from '../registry.js';
import { randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { getDb } from '../../../../../utils/db.js';

function generateSk(): string {
  return randomBytes(16).toString('hex');
}

registerAdminMethod('mineApiKey.list', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;

  const items = await db.collection('userApiKeys')
    .find({
      userId,
      deletedAt: null,
      type: 'apiKey'
    })
    .sort({ createdAt: -1 })
    .toArray();

  return items.map(item => ({
    _id: item._id.toString(),
    name: item.name || '未命名',
    sk: item.sk.substring(0, 8) + '...' + item.sk.substring(item.sk.length - 4),
    createdAt: item.createdAt
  }));
});

registerAdminMethod('mineApiKey.create', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;
  const { name } = params as any;

  const count = await db.collection('userApiKeys').countDocuments({
    userId,
    deletedAt: null,
    type: 'apiKey'
  });

  if (count >= 5) {
    throw new Error('最多只能创建 5 个 API Key');
  }

  const sk = generateSk();
  const now = new Date();

  const result = await db.collection('userApiKeys').insertOne({
    userId,
    type: 'apiKey',
    name: name || null,
    sk,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    expiresAt: null
  });

  return {
    _id: result.insertedId.toString(),
    name: name || '未命名',
    sk,
    createdAt: now
  };
});

registerAdminMethod('mineApiKey.delete', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;
  const { id } = params as any;

  if (!id) {
    throw new Error('API Key ID is required');
  }

  const result = await db.collection('userApiKeys').updateOne(
    {
      _id: new ObjectId(id),
      userId,
      deletedAt: null,
      type: 'apiKey'
    },
    {
      $set: {
        deletedAt: new Date()
      }
    }
  );

  if (result.matchedCount === 0) {
    throw new Error('API Key not found');
  }

  return { success: true };
});