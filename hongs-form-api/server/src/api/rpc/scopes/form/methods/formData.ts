import { ObjectId } from 'mongodb';
import { validate } from 'hongs-form';
import { registerFormMethod } from '../registry.js';
import { generateDataHash } from '../../../shared/formData.js';

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
