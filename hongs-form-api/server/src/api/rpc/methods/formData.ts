import { ObjectId } from 'mongodb';
import { createHash } from 'node:crypto';
import { registerMethod } from '../registry.js';
import { validate } from 'hongs-form';

// 生成数据哈希
function generateDataHash(formId: string, userId: string | null, data: object): string {
  const str = `${formId}:${userId || ''}:${JSON.stringify(data)}`;
  return createHash('sha256').update(str).digest('hex');
}

// 表单数据列表
registerMethod('formData.list', async (params, ctx) => {
  const { page = 1, pageSize = 20, formId, userId, channel, startDate, endDate } = params as any;
  const skip = (page - 1) * pageSize;

  const query: any = { deletedAt: null };
  if (formId) query.formId = new ObjectId(formId);
  if (userId) query.userId = new ObjectId(userId);
  if (channel) query.channel = channel;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const [items, total] = await Promise.all([
    ctx.db.collection('form_data')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray(),
    ctx.db.collection('form_data').countDocuments(query)
  ]);

  return { items, total, page, pageSize };
});

// 获取单条数据
registerMethod('formData.get', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Data ID is required');

  const data = await ctx.db.collection('form_data').findOne({
    _id: new ObjectId(id),
    deletedAt: null
  });

  if (!data) throw new Error('Data not found');
  return data;
});

// 创建表单数据
registerMethod('formData.create', async (params, ctx) => {
  const { formId, userId, data, channel = 'web', userIp, userAgent } = params as any;
  if (!formId) throw new Error('Form ID is required');
  if (!data) throw new Error('Form data is required');

  // 获取表单信息
  const form = await ctx.db.collection('form').findOne({
    _id: new ObjectId(formId),
    deletedAt: null
  });

  if (!form) throw new Error('Form not found');
  if (form.status !== 2) throw new Error('Form is not published');

  // 使用 hongs-form 验证表单数据，获取校验后的干净值
  const validatedData = validate(data, form.schema, {});

  // 检查每用户限填一次
  if (form.config?.oncePerUser && userId) {
    const existing = await ctx.db.collection('form_data').findOne({
      formId: new ObjectId(formId),
      userId: new ObjectId(userId),
      deletedAt: null
    });
    if (existing) throw new Error('You have already submitted this form');
  }

  // 生成数据哈希防重（使用校验后的数据）
  const dataHash = generateDataHash(formId, userId, validatedData);

  const now = new Date();
  const result = await ctx.db.collection('form_data').insertOne({
    formId: new ObjectId(formId),
    userId: userId ? new ObjectId(userId) : null,
    data: validatedData,
    dataHash,
    userIp: userIp || null,
    userAgent: userAgent || null,
    channel,
    status: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });

  // 更新表单提交计数
  await ctx.db.collection('form').updateOne(
    { _id: new ObjectId(formId) },
    { $inc: { dataCount: 1 } }
  );

  return { id: result.insertedId.toString() };
});

// 更新数据
registerMethod('formData.update', async (params, ctx) => {
  const { id, data, status } = params as any;
  if (!id) throw new Error('Data ID is required');

  const updateData: any = { updatedAt: new Date() };
  if (data !== undefined) updateData.data = data;
  if (status !== undefined) updateData.status = status;

  const result = await ctx.db.collection('form_data').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: updateData }
  );

  if (result.matchedCount === 0) throw new Error('Data not found');
  return { success: true };
});

// 删除数据
registerMethod('formData.delete', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Data ID is required');

  // 获取数据以更新计数
  const formData = await ctx.db.collection('form_data').findOne({
    _id: new ObjectId(id),
    deletedAt: null
  });

  if (!formData) throw new Error('Data not found');

  // 软删除
  await ctx.db.collection('form_data').updateOne(
    { _id: new ObjectId(id) },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } }
  );

  // 减少表单提交计数
  await ctx.db.collection('form').updateOne(
    { _id: formData.formId },
    { $inc: { dataCount: -1 } }
  );

  return { success: true };
});

// 导出数据（返回全部，分页由调用方处理）
registerMethod('formData.export', async (params, ctx) => {
  const { formId, startDate, endDate } = params as any;
  if (!formId) throw new Error('Form ID is required');

  const query: any = { formId: new ObjectId(formId), deletedAt: null };
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const items = await ctx.db.collection('form_data')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  return items;
});

// 数据统计
registerMethod('formData.stats', async (params, ctx) => {
  const { formId } = params as any;
  if (!formId) throw new Error('Form ID is required');

  const [total, todayCount, channelStats] = await Promise.all([
    ctx.db.collection('form_data').countDocuments({
      formId: new ObjectId(formId),
      deletedAt: null
    }),
    ctx.db.collection('form_data').countDocuments({
      formId: new ObjectId(formId),
      deletedAt: null,
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    }),
    ctx.db.collection('form_data').aggregate([
      { $match: { formId: new ObjectId(formId), deletedAt: null } },
      { $group: { _id: '$channel', count: { $sum: 1 } } }
    ]).toArray()
  ]);

  return {
    total,
    today: todayCount,
    byChannel: Object.fromEntries(channelStats.map((c: any) => [c._id, c.count]))
  };
});
