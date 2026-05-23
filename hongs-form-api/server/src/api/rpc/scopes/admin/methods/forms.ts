import { ObjectId } from 'mongodb';
import { formValidate } from 'hongs-form';
import { registerAdminMethod } from '../registry.js';

registerAdminMethod('form.list', async (params, ctx) => {
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

registerAdminMethod('form.get', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');

  const form = await ctx.db.collection('form').findOne({
    _id: new ObjectId(id),
    deletedAt: null
  });

  if (!form) throw new Error('Form not found');
  return form;
});

registerAdminMethod('form.create', async (params, ctx) => {
  const { userId, name, title, description, schema, config = {}, icon, color } = params as any;
  if (!userId) throw new Error('User ID is required');
  if (!name) throw new Error('Form name is required');
  if (!schema) throw new Error('Form schema is required');

  const validatedSchema = formValidate(schema);
  const now = new Date();
  const result = await ctx.db.collection('form').insertOne({
    userId: new ObjectId(userId),
    type: 'form',
    name,
    title: title || name,
    description: description || null,
    icon: icon || null,
    color: color || '#1890ff',
    schema: validatedSchema,
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

registerAdminMethod('form.update', async (params, ctx) => {
  const { id, ...updateData } = params as any;
  if (!id) throw new Error('Form ID is required');

  if (updateData.userId) updateData.userId = new ObjectId(updateData.userId);
  if (updateData.schema) updateData.schema = formValidate(updateData.schema);
  updateData.updatedAt = new Date();

  const result = await ctx.db.collection('form').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: updateData }
  );

  if (result.matchedCount === 0) throw new Error('Form not found');
  return { success: true };
});

registerAdminMethod('form.publish', async (params, ctx) => {
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

registerAdminMethod('form.unpublish', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');

  const result = await ctx.db.collection('form').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: { status: 1, updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) throw new Error('Form not found');
  return { success: true };
});

registerAdminMethod('form.delete', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');

  const result = await ctx.db.collection('form').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) throw new Error('Form not found');
  return { success: true };
});
