import { registerAgentMethod } from '../registry.js';
import { randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { getDb } from '../../../../../utils/db.js';
import { apiKeyCreateSchema, apiKeyDeleteSchema } from '../../../../../schemas/apiKey.js';

function generateSk(): string {
  return randomBytes(16).toString('hex');
}

registerAgentMethod('mineApiKey.list', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;
  const { page = 1, pageSize = 20 } = params as any;

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

registerAgentMethod('mineApiKey.create', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;
  
  // 使用 Zod 校验参数
  const { name } = apiKeyCreateSchema.parse(params);

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

registerAgentMethod('mineApiKey.delete', async (params, ctx) => {
  const db = getDb();
  const userId = ctx.userId;
  
  // 使用 Zod 校验参数
  const { id } = apiKeyDeleteSchema.parse(params);

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