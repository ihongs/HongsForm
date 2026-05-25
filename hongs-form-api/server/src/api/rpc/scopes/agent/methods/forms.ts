import { ObjectId } from 'mongodb';
import { formValidate } from 'hongs-form';
import { registerAgentMethod } from '../registry.js';
import { findOwnedForm, requireUserId } from '../../../shared/forms.js';

registerAgentMethod('form.list', async (params, ctx) => {
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

registerAgentMethod('form.get', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');
  return findOwnedForm(ctx, id);
});

registerAgentMethod('form.create', async (params, ctx) => {
  const { name, title, description, schema, config = {}, icon, color } = params as any;
  const userId = requireUserId(ctx);
  if (!name) throw new Error('Form name is required');
  if (!schema) throw new Error('Form schema is required');

  const validatedSchema = formValidate(schema);
  const now = new Date();
  const result = await ctx.db.collection('form').insertOne({
    userId,
    type: 'form',
    name,
    title: title || name,
    description: description || null,
    icon: icon || null,
    color: color || '#1890ff',
    schema: validatedSchema,
    config: {
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

registerAgentMethod('form.update', async (params, ctx) => {
  const { id, userId: _userId, _id, createdAt, deletedAt, publishedAt, dataCount, ...updateData } = params as any;
  if (!id) throw new Error('Form ID is required');
  await findOwnedForm(ctx, id);

  if (updateData.schema) updateData.schema = formValidate(updateData.schema);
  updateData.updatedAt = new Date();

  const result = await ctx.db.collection('form').updateOne(
    { _id: new ObjectId(id), userId: ctx.userId, deletedAt: null },
    { $set: updateData }
  );

  if (result.matchedCount === 0) throw new Error('Form not found');
  return { success: true };
});

registerAgentMethod('form.publish', async (params, ctx) => {
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

registerAgentMethod('form.unpublish', async (params, ctx) => {
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

registerAgentMethod('form.delete', async (params, ctx) => {
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
