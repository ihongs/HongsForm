import { ObjectId } from 'mongodb';
import { registerAgentMethod } from '../registry.js';
import { requireUserId } from '../../../shared/forms.js';
import { generateDataHash, requireOwnedForm, requireOwnedFormData } from '../../../shared/formData.js';

registerAgentMethod('formData.list', async (params, ctx) => {
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

registerAgentMethod('formData.get', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Data ID is required');
  return requireOwnedFormData(ctx, id);
});

registerAgentMethod('formData.update', async (params, ctx) => {
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

registerAgentMethod('formData.delete', async (params, ctx) => {
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

registerAgentMethod('formData.export', async (params, ctx) => {
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

registerAgentMethod('formData.stats', async (params, ctx) => {
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
