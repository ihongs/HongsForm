import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { registerAgentMethod } from '../registry.js';
import { requireUserId } from '../../../shared/forms.js';
import { wrapError } from '../../../../../utils/finder.js';
import { dataFieldsToSchema } from '../../../../../schemas/formRecord.js';
import { generateDataHash, requireOwnedForm, requireOwnedFormData } from '../../../shared/formRecords.js';

registerAgentMethod('formRecord.list', async (params, ctx) => {
  const { page = 1, pageSize = 20, formId, userId, channel, startDate, endDate } = params as any;
  const skip = (page - 1) * pageSize;
  const ownerId = requireUserId(ctx);

  const formQuery: any = { userId: ownerId, deletedAt: null };
  if (formId) formQuery._id = new ObjectId(formId);
  const forms = await ctx.db.collection('forms').find(formQuery).project({ _id: 1 }).toArray();
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
    ctx.db.collection('formRecords')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray(),
    ctx.db.collection('formRecords').countDocuments(query)
  ]);

  return { items, total, page, pageSize };
});

registerAgentMethod('formRecord.get', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Data ID is required');
  return requireOwnedFormData(ctx, id);
});

registerAgentMethod('formRecord.update', async (params, ctx) => {
  const { id, data, status } = params as any;
  if (!id) throw new Error('Data ID is required');
  await requireOwnedFormData(ctx, id);

  const reco = await ctx.db.collection('formRecords').findOne({
    _id: new ObjectId(id),
    deletedAt: null
  });
  if (!reco) throw new Error('Form record not found');
  const form = await ctx.db.collection('forms').findOne({
    _id: reco.formId,
    deletedAt: null
  });
  if (!form) throw new Error('Form not found');

  const updateData: any = { updatedAt: new Date() };
  if (status !== undefined) updateData.status = status;

  // 校验表单数据并给错误附加 deta 层级
  if (data !== undefined) {
    try {
      updateData.data = dataFieldsToSchema(form.fields).parse(data);
    } catch (er) {
      if (er instanceof z.ZodError) {
        throw wrapError(er, ['data']);
      }
      throw er
    }
  }

  const result = await ctx.db.collection('formRecords').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: updateData }
  );

  if (result.matchedCount === 0) throw new Error('Data not found');
  return { success: true };
});

registerAgentMethod('formRecord.delete', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Data ID is required');

  const formData = await requireOwnedFormData(ctx, id);

  await ctx.db.collection('formRecords').updateOne(
    { _id: new ObjectId(id) },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } }
  );

  await ctx.db.collection('forms').updateOne(
    { _id: formData.formId },
    { $inc: { dataCount: -1 } }
  );

  return { success: true };
});

registerAgentMethod('formRecord.export', async (params, ctx) => {
  const { formId, startDate, endDate } = params as any;
  if (!formId) throw new Error('Form ID is required');
  await requireOwnedForm(ctx, formId);

  const query: any = { formId: new ObjectId(formId), deletedAt: null };
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return ctx.db.collection('formRecords')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();
});

registerAgentMethod('formRecord.stats', async (params, ctx) => {
  const { formId } = params as any;
  if (!formId) throw new Error('Form ID is required');
  await requireOwnedForm(ctx, formId);

  const [total, todayCount, channelStats] = await Promise.all([
    ctx.db.collection('formRecords').countDocuments({
      formId: new ObjectId(formId),
      deletedAt: null
    }),
    ctx.db.collection('formRecords').countDocuments({
      formId: new ObjectId(formId),
      deletedAt: null,
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    }),
    ctx.db.collection('formRecords').aggregate([
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

registerAgentMethod('formRecord.confirmSign', async (params, ctx) => {
  const { id, formId } = params as any;
  if (!id) throw new Error('id is required');
  if (!formId) throw new Error('formId is required');

  // 确保是自己的表单
  await requireOwnedForm(ctx, formId);

  const now = new Date();
  const result = await ctx.db.collection('formRecords').updateOne(
    { _id: new ObjectId(id), formId: new ObjectId(formId), deletedAt: null },
    { $set: { status: 2, signedAt: now } }
  );

  if (result.matchedCount === 0) {
    return { success: false, message: '记录不存在' };
  }

  return {
    success: true,
    id,
    signedAt: now
  };
});
