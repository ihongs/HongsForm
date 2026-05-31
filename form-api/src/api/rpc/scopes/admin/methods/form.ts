import { ObjectId } from 'mongodb';
import { registerAdminMethod } from '../registry.js';
import { findOwnedForm, requireUserId } from '../../../shared/forms.js';
import { formCreateSchema, formUpdateSchema } from '../../../../../schemas/form.js';

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
    ctx.db.collection('forms')
      .aggregate([
        { $match: query },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: pageSize },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userDoc'
          }
        },
        {
          $addFields: {
            user: {
              $ifNull: [
                { $arrayElemAt: ['$userDoc.nickname', 0] },
                { $arrayElemAt: ['$userDoc.username', 0] },
                ''
              ]
            }
          }
        },
        { $project: { userDoc: 0 } }
      ])
      .toArray(),
    ctx.db.collection('forms').countDocuments(query)
  ]);

  return { items, total, page, pageSize };
});

registerAdminMethod('form.get', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');

  const form = await ctx.db.collection('forms').findOne({
    _id: new ObjectId(id),
    deletedAt: null
  });

  if (!form) throw new Error('Form not found');
  return form;
});

registerAdminMethod('form.create', async (params, ctx) => {
  const { userId } = params as any;
  if (!userId) throw new Error('User ID is required');
  
  // 使用 Zod 校验参数
  const createData = formCreateSchema.parse(params);
  
  const now = new Date();
  const result = await ctx.db.collection('forms').insertOne({
    ...createData,
    userId: new ObjectId(userId),
    type: 'form',
    status: 1,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });

  return { id: result.insertedId.toString() };
});

registerAdminMethod('form.update', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');
  
  // 使用 Zod 校验参数
  const parsedData = formUpdateSchema.parse(params);
  
  // 创建新对象，避免直接修改 zod 解析后的对象
  const updateData: any = { ...parsedData };
  delete updateData.id;
  updateData.updatedAt = new Date();
  if (updateData.userId) updateData.userId = new ObjectId(updateData.userId);

  const result = await ctx.db.collection('forms').updateOne(
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
  const result = await ctx.db.collection('forms').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: { status: 2, publishedAt: now, updatedAt: now } }
  );

  if (result.matchedCount === 0) throw new Error('Form not found');
  return { success: true };
});

registerAdminMethod('form.unpublish', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');

  const result = await ctx.db.collection('forms').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: { status: 1, updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) throw new Error('Form not found');
  return { success: true };
});

registerAdminMethod('form.delete', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');

  const result = await ctx.db.collection('forms').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) throw new Error('Form not found');
  return { success: true };
});