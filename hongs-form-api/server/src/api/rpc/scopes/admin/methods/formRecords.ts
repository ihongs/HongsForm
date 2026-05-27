import { ObjectId } from 'mongodb';
import { registerAdminMethod } from '../registry.js';

registerAdminMethod('formRecord.list', async (params, ctx) => {
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

registerAdminMethod('formRecord.get', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Data ID is required');

  const data = await ctx.db.collection('formRecords').findOne({
    _id: new ObjectId(id),
    deletedAt: null
  });

  if (!data) throw new Error('Data not found');
  return data;
});

registerAdminMethod('formRecord.update', async (params, ctx) => {
  const { id, data, status } = params as any;
  if (!id) throw new Error('Data ID is required');

  const updateData: any = { updatedAt: new Date() };
  if (data !== undefined) updateData.data = data;
  if (status !== undefined) updateData.status = status;

  const result = await ctx.db.collection('formRecords').updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: updateData }
  );

  if (result.matchedCount === 0) throw new Error('Data not found');
  return { success: true };
});

registerAdminMethod('formRecord.delete', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Data ID is required');

  const formData = await ctx.db.collection('formRecords').findOne({
    _id: new ObjectId(id),
    deletedAt: null
  });

  if (!formData) throw new Error('Data not found');

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

registerAdminMethod('formRecord.export', async (params, ctx) => {
  const { formId, startDate, endDate } = params as any;
  if (!formId) throw new Error('Form ID is required');

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

registerAdminMethod('formRecord.stats', async (params, ctx) => {
  const { formId } = params as any;
  if (!formId) throw new Error('Form ID is required');

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
