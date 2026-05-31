import { ObjectId } from 'mongodb';
import { registerAgentMethod } from '../registry.js';
import { findOwnedForm, requireUserId } from '../../../shared/forms.js';
import { formCreateSchema, formUpdateSchema } from '../../../../../schemas/form.js';

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
    ctx.db.collection('forms')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray(),
    ctx.db.collection('forms').countDocuments(query)
  ]);

  return { items, total, page, pageSize };
});

registerAgentMethod('form.get', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');
  return findOwnedForm(ctx, id);
});

registerAgentMethod('form.create', async (params, ctx) => {
  const userId = requireUserId(ctx);
  
  // 使用 Zod 校验参数
  const createData = formCreateSchema.parse(params);

  const now = new Date();
  const result = await ctx.db.collection('forms').insertOne({
    ...createData,
    userId,
    type: 'form',
    status: 1,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });

  return { id: result.insertedId.toString() };
});

registerAgentMethod('form.update', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');
  await findOwnedForm(ctx, id);

  // 使用 Zod 校验参数
  const parsedData = formUpdateSchema.parse(params);
  
  // 创建新对象，避免直接修改 zod 解析后的对象
  const updateData: any = { ...parsedData };
  delete updateData.id;
  updateData.updatedAt = new Date();

  const result = await ctx.db.collection('forms').updateOne(
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
  const result = await ctx.db.collection('forms').updateOne(
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

  const result = await ctx.db.collection('forms').updateOne(
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

  const result = await ctx.db.collection('forms').updateOne(
    { _id: new ObjectId(id), userId: ctx.userId, deletedAt: null },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) throw new Error('Form not found');
  return { success: true };
});