import { ObjectId } from 'mongodb';
import { createHash } from 'node:crypto';
import { registerAdminMethod, registerAgentMethod, registerFormMethod, RpcContext } from '../registry.js';
import { validate } from 'hongs-form';

function generateDataHash(formId: string, userId: string | null, data: object): string {
  const str = `${formId}:${userId || ''}:${JSON.stringify(data)}`;
  return createHash('sha256').update(str).digest('hex');
}

function requireUserId(ctx: RpcContext): ObjectId {
  if (!ctx.userId) throw new Error('Unauthorized');
  return ctx.userId;
}

async function requireOwnedForm(ctx: RpcContext, formId: string): Promise<any> {
  const userId = requireUserId(ctx);
  const form = await ctx.db.collection('form').findOne({
    _id: new ObjectId(formId),
    userId,
    deletedAt: null
  });
  if (!form) throw new Error('Form not found');
  return form;
}

async function requireOwnedFormData(ctx: RpcContext, id: string): Promise<any> {
  const userId = requireUserId(ctx);
  const item = await ctx.db.collection('formData').aggregate([
    { $match: { _id: new ObjectId(id), deletedAt: null } },
    {
      $lookup: {
        from: 'form',
        localField: 'formId',
        foreignField: '_id',
        as: 'form'
      }
    },
    { $unwind: '$form' },
    { $match: { 'form.userId': userId, 'form.deletedAt': null } },
    { $project: { form: 0 } }
  ]).next();

  if (!item) throw new Error('Data not found');
  return item;
}

registerFormMethod('formData.create', async (params, ctx) => {
  const { formId, data, channel = 'web', userIp, userAgent } = params as any;
  const submitterId = ctx.userId ?? null;
  if (!formId) throw new Error('Form ID is required');
  if (!data) throw new Error('Form data is required');

  const form = await ctx.db.collection('form').findOne({
    _id: new ObjectId(formId),
    deletedAt: null,
    status: 2
  });

  if (!form) throw new Error('Form not found');

  const validatedData = validate(data, form.schema, {});

  if (form.config?.oncePerUser && submitterId) {
    const existing = await ctx.db.collection('formData').findOne({
      formId: new ObjectId(formId),
      userId: submitterId,
      deletedAt: null
    });
    if (existing) throw new Error('You have already submitted this form');
  }

  const dataHash = generateDataHash(formId, submitterId?.toString() ?? null, validatedData);

  const now = new Date();
  const result = await ctx.db.collection('formData').insertOne({
    formId: new ObjectId(formId),
    userId: submitterId,
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

  await ctx.db.collection('form').updateOne(
    { _id: new ObjectId(formId) },
    { $inc: { dataCount: 1 } }
  );

  return { id: result.insertedId.toString() };
});

registerAgentMethod('agent.formData.list', async (params, ctx) => {
  const { page = 1, pageSize = 20, formId, userId, channel, startDate, endDate } = params as any;
  const skip = (page - 1) * pageSize;
  const ownerId = requireUserId(ctx);

  const formQuery: any = { userId: ownerId, deletedAt: null };
  if (formId) formQuery._id = new ObjectId(formId);
  const forms = await ctx.db.collection('form').find(formQuery).project({ _id: 1 }).toArray();
  const formIds = forms.map((form) => form._id);

  const query: any = { deletedAt: null, formId: { $in: formIds } };
  if (userId) query.userId = new ObjectId(userId);
  if (channel) query.channel = channel;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const [items, total] = await Promise.all([
    ctx.db.collection('formData')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray(),
    ctx.db.collection('formData').countDocuments(query)
  ]);

  return { items, total, page, pageSize };
});

registerAgentMethod('agent.formData.get', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Data ID is required');
  return requireOwnedFormData(ctx, id);
});

registerAgentMethod('agent.formData.update', async (params, ctx) => {
  const { id, data, status } = params as any;
  if (!id) throw new Error('Data ID is required');
  await requireOwnedFormData(ctx, id);

  const updateData: any = { updatedAt: new Date() };
  if (data !== undefined) updateData.data = data;
  if (status !== undefined) updateData.status = status;

  const result = await ctx.db.collection('formData').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: updateData }
  );

  if (result.matchedCount === 0) throw new Error('Data not found');
  return { success: true };
});

registerAgentMethod('agent.formData.delete', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Data ID is required');

  const formData = await requireOwnedFormData(ctx, id);

  await ctx.db.collection('formData').updateOne(
    { _id: new ObjectId(id) },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } }
  );

  await ctx.db.collection('form').updateOne(
    { _id: formData.formId },
    { $inc: { dataCount: -1 } }
  );

  return { success: true };
});

registerAgentMethod('agent.formData.export', async (params, ctx) => {
  const { formId, startDate, endDate } = params as any;
  if (!formId) throw new Error('Form ID is required');
  await requireOwnedForm(ctx, formId);

  const query: any = { formId: new ObjectId(formId), deletedAt: null };
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return ctx.db.collection('formData')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();
});

registerAgentMethod('agent.formData.stats', async (params, ctx) => {
  const { formId } = params as any;
  if (!formId) throw new Error('Form ID is required');
  await requireOwnedForm(ctx, formId);

  const [total, todayCount, channelStats] = await Promise.all([
    ctx.db.collection('formData').countDocuments({
      formId: new ObjectId(formId),
      deletedAt: null
    }),
    ctx.db.collection('formData').countDocuments({
      formId: new ObjectId(formId),
      deletedAt: null,
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    }),
    ctx.db.collection('formData').aggregate([
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

registerAdminMethod('admin.formData.list', async (params, ctx) => {
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
    ctx.db.collection('formData')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray(),
    ctx.db.collection('formData').countDocuments(query)
  ]);

  return { items, total, page, pageSize };
});

registerAdminMethod('admin.formData.get', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Data ID is required');

  const data = await ctx.db.collection('formData').findOne({
    _id: new ObjectId(id),
    deletedAt: null
  });

  if (!data) throw new Error('Data not found');
  return data;
});

registerAdminMethod('admin.formData.update', async (params, ctx) => {
  const { id, data, status } = params as any;
  if (!id) throw new Error('Data ID is required');

  const updateData: any = { updatedAt: new Date() };
  if (data !== undefined) updateData.data = data;
  if (status !== undefined) updateData.status = status;

  const result = await ctx.db.collection('formData').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: updateData }
  );

  if (result.matchedCount === 0) throw new Error('Data not found');
  return { success: true };
});

registerAdminMethod('admin.formData.delete', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Data ID is required');

  const formData = await ctx.db.collection('formData').findOne({
    _id: new ObjectId(id),
    deletedAt: null
  });

  if (!formData) throw new Error('Data not found');

  await ctx.db.collection('formData').updateOne(
    { _id: new ObjectId(id) },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } }
  );

  await ctx.db.collection('form').updateOne(
    { _id: formData.formId },
    { $inc: { dataCount: -1 } }
  );

  return { success: true };
});

registerAdminMethod('admin.formData.export', async (params, ctx) => {
  const { formId, startDate, endDate } = params as any;
  if (!formId) throw new Error('Form ID is required');

  const query: any = { formId: new ObjectId(formId), deletedAt: null };
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return ctx.db.collection('formData')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();
});

registerAdminMethod('admin.formData.stats', async (params, ctx) => {
  const { formId } = params as any;
  if (!formId) throw new Error('Form ID is required');

  const [total, todayCount, channelStats] = await Promise.all([
    ctx.db.collection('formData').countDocuments({
      formId: new ObjectId(formId),
      deletedAt: null
    }),
    ctx.db.collection('formData').countDocuments({
      formId: new ObjectId(formId),
      deletedAt: null,
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    }),
    ctx.db.collection('formData').aggregate([
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
