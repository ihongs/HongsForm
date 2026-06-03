import { ObjectId } from 'mongodb';
import { registerAgentMethod } from '../registry.js';
import { findOwnedForm, requireUserId, validateVoteForm } from '../../../shared/forms.js';
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

  // 如果是投票表单，验证必须有 countable 字段
  if (createData.type === 'vote') {
    validateVoteForm(createData.fields);
  }

  const now = new Date();
  const result = await ctx.db.collection('forms').insertOne({
    ...createData,
    userId,
    type: createData.type || 'form',
    status: 1,
    publishedAt: null,
    counts: {},
    countedAt: null,
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
  const form = await findOwnedForm(ctx, id);

  // 如果是投票表单，验证必须有 countable 字段
  if (form.type === 'vote') {
    validateVoteForm(form.fields);
  }

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

registerAgentMethod('form.recount', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');
  const form = await findOwnedForm(ctx, id);

  // 查找所有有效的表单记录
  const records = await ctx.db.collection('formRecords').find({
    formId: new ObjectId(id),
    status: 1,
    deletedAt: null
  }).toArray();

  // 重新计算 counts
  const counts: any = { __total__: records.length };
  const countableFields = form.fields.filter(f => 
    f.countable && ['select', 'check', 'radio', 'switch'].includes(f.inputType)
  );

  records.forEach(record => {
    countableFields.forEach(field => {
      const fieldValue = record.data[field.name];
      if (fieldValue === undefined || fieldValue === null) return;

      if (!counts[field.name]) {
        counts[field.name] = {};
      }

      if (field.inputType === 'check' && Array.isArray(fieldValue)) {
        fieldValue.forEach((val: any) => {
          const key = String(val);
          counts[field.name][key] = (counts[field.name][key] || 0) + 1;
        });
      } else {
        const key = String(fieldValue);
        counts[field.name][key] = (counts[field.name][key] || 0) + 1;
      }
    });
  });

  // 更新表单的 counts
  await ctx.db.collection('forms').updateOne(
    { _id: new ObjectId(id), userId: ctx.userId, deletedAt: null },
    { $set: { counts, countedAt: new Date(), updatedAt: new Date() } }
  );

  return { success: true, counts, totalRecords: records.length };
});