import { ObjectId } from 'mongodb';
import { registerAdminMethod, registerAgentMethod, registerFormMethod, RpcContext } from '../registry.js';

function requireUserId(ctx: RpcContext): ObjectId {
  if (!ctx.userId) throw new Error('Unauthorized');
  return ctx.userId;
}

async function findOwnedForm(ctx: RpcContext, id: string): Promise<any> {
  const userId = requireUserId(ctx);
  const form = await ctx.db.collection('form').findOne({
    _id: new ObjectId(id),
    userId,
    deletedAt: null
  });
  if (!form) throw new Error('Form not found');
  return form;
}

function publicFormSchema(form: any): Record<string, unknown> {
  return {
    id: form._id.toString(),
    name: form.name,
    title: form.title,
    description: form.description,
    icon: form.icon,
    color: form.color,
    schema: form.schema,
    config: {
      anonymous: form.config?.anonymous,
      startAt: form.config?.startAt,
      endAt: form.config?.endAt
    },
    status: form.status
  };
}

registerFormMethod('form.schema', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');

  const form = await ctx.db.collection('form').findOne({
    _id: new ObjectId(id),
    deletedAt: null,
    status: 2
  });

  if (!form) throw new Error('Form not found');
  return publicFormSchema(form);
});

registerAgentMethod('agent.form.list', async (params, ctx) => {
  const { page = 1, pageSize = 20, keyword = '', status } = params as any;
  const skip = (page - 1) * pageSize;
  const userId = requireUserId(ctx);

  const query: any = { userId, deletedAt: null };
  if (status !== undefined) query.status = status;
  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { title: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } }
    ];
  }

  const [items, total] = await Promise.all([
    ctx.db.collection('form')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray(),
    ctx.db.collection('form').countDocuments(query)
  ]);

  return { items, total, page, pageSize };
});

registerAgentMethod('agent.form.get', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');
  return findOwnedForm(ctx, id);
});

registerAgentMethod('agent.form.create', async (params, ctx) => {
  const { name, title, description, schema, config = {}, icon, color } = params as any;
  const userId = requireUserId(ctx);
  if (!name) throw new Error('Form name is required');
  if (!schema) throw new Error('Form schema is required');

  const now = new Date();
  const result = await ctx.db.collection('form').insertOne({
    userId,
    name,
    title: title || name,
    description: description || null,
    icon: icon || null,
    color: color || '#1890ff',
    schema,
    config: {
      anonymous: false,
      oncePerUser: false,
      maxSubmissions: null,
      startAt: null,
      endAt: null,
      ...config
    },
    status: 1,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });

  return { id: result.insertedId.toString() };
});

registerAgentMethod('agent.form.update', async (params, ctx) => {
  const { id, userId: _userId, _id, createdAt, deletedAt, publishedAt, dataCount, ...updateData } = params as any;
  if (!id) throw new Error('Form ID is required');
  await findOwnedForm(ctx, id);

  updateData.updatedAt = new Date();

  const result = await ctx.db.collection('form').updateOne(
    { _id: new ObjectId(id), userId: ctx.userId, deletedAt: null },
    { $set: updateData }
  );

  if (result.matchedCount === 0) throw new Error('Form not found');
  return { success: true };
});

registerAgentMethod('agent.form.publish', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');
  await findOwnedForm(ctx, id);

  const now = new Date();
  const result = await ctx.db.collection('form').updateOne(
    { _id: new ObjectId(id), userId: ctx.userId, deletedAt: null },
    { $set: { status: 2, publishedAt: now, updatedAt: now } }
  );

  if (result.matchedCount === 0) throw new Error('Form not found');
  return { success: true };
});

registerAgentMethod('agent.form.unpublish', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');
  await findOwnedForm(ctx, id);

  const result = await ctx.db.collection('form').updateOne(
    { _id: new ObjectId(id), userId: ctx.userId, deletedAt: null },
    { $set: { status: 1, updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) throw new Error('Form not found');
  return { success: true };
});

registerAgentMethod('agent.form.delete', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');
  await findOwnedForm(ctx, id);

  const result = await ctx.db.collection('form').updateOne(
    { _id: new ObjectId(id), userId: ctx.userId, deletedAt: null },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) throw new Error('Form not found');
  return { success: true };
});

registerAdminMethod('admin.form.list', async (params, ctx) => {
  const { page = 1, pageSize = 20, keyword = '', userId, status } = params as any;
  const skip = (page - 1) * pageSize;

  const query: any = { deletedAt: null };
  if (userId) query.userId = new ObjectId(userId);
  if (status !== undefined) query.status = status;
  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { title: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } }
    ];
  }

  const [items, total] = await Promise.all([
    ctx.db.collection('form')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray(),
    ctx.db.collection('form').countDocuments(query)
  ]);

  return { items, total, page, pageSize };
});

registerAdminMethod('admin.form.get', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');

  const form = await ctx.db.collection('form').findOne({
    _id: new ObjectId(id),
    deletedAt: null
  });

  if (!form) throw new Error('Form not found');
  return form;
});

registerAdminMethod('admin.form.create', async (params, ctx) => {
  const { userId, name, title, description, schema, config = {}, icon, color } = params as any;
  if (!userId) throw new Error('User ID is required');
  if (!name) throw new Error('Form name is required');
  if (!schema) throw new Error('Form schema is required');

  const now = new Date();
  const result = await ctx.db.collection('form').insertOne({
    userId: new ObjectId(userId),
    name,
    title: title || name,
    description: description || null,
    icon: icon || null,
    color: color || '#1890ff',
    schema,
    config: {
      anonymous: false,
      oncePerUser: false,
      maxSubmissions: null,
      startAt: null,
      endAt: null,
      ...config
    },
    status: 1,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });

  return { id: result.insertedId.toString() };
});

registerAdminMethod('admin.form.update', async (params, ctx) => {
  const { id, ...updateData } = params as any;
  if (!id) throw new Error('Form ID is required');

  if (updateData.userId) updateData.userId = new ObjectId(updateData.userId);
  updateData.updatedAt = new Date();

  const result = await ctx.db.collection('form').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: updateData }
  );

  if (result.matchedCount === 0) throw new Error('Form not found');
  return { success: true };
});

registerAdminMethod('admin.form.publish', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');

  const now = new Date();
  const result = await ctx.db.collection('form').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: { status: 2, publishedAt: now, updatedAt: now } }
  );

  if (result.matchedCount === 0) throw new Error('Form not found');
  return { success: true };
});

registerAdminMethod('admin.form.unpublish', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');

  const result = await ctx.db.collection('form').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: { status: 1, updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) throw new Error('Form not found');
  return { success: true };
});

registerAdminMethod('admin.form.delete', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');

  const result = await ctx.db.collection('form').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) throw new Error('Form not found');
  return { success: true };
});
