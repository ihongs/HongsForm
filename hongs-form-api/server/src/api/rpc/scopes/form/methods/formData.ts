import { ObjectId } from 'mongodb';
import { validate } from 'hongs-form';
import { registerFormMethod } from '../registry.js';
import { generateDataHash } from '../../../shared/formData.js';
import { md5, verifyCode } from '../../../../../utils/verify.js';

// 检查访客是否已提交过此表单
registerFormMethod('formData.checkSubmitted', async (params, ctx) => {
  const { formId, userToken } = params as any;
  if (!formId) throw new Error('Form ID is required');
  if (!userToken) throw new Error('User token is required');

  const form = await ctx.db.collection('form').findOne({
    _id: new ObjectId(formId),
    deletedAt: null,
    status: 2
  });

  if (!form) throw new Error('Form not found');

  if (!form.config?.oncePerGuest) {
    return { submitted: false };
  }

  const existing = await ctx.db.collection('formData').findOne({
    formId: new ObjectId(formId),
    userToken,
    deletedAt: null
  });

  return { submitted: !!existing };
});

registerFormMethod('formData.create', async (params, ctx) => {
  const { formId, data, channel = 'web', userIp, userAgent, userToken, phoneCode, emailCode } = params as any;
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

  // 验证手机验证码
  if (form.config?.oncePerPhone) {
    const phone = validatedData.phone;
    if (!phone) throw new Error('请填写手机号');
    
    // 验证并删除验证码
    await verifyCode(formId, md5(phone), phoneCode, 'sms');
    
    // 检查该手机号是否已提交过
    const existingPhone = await ctx.db.collection('formData').findOne({
      formId: new ObjectId(formId),
      data: { phone },
      deletedAt: null
    });
    if (existingPhone) throw new Error('该手机号已填写过此表单');
  }

  // 验证邮箱验证码
  if (form.config?.oncePerEmail) {
    const email = validatedData.email;
    if (!email) throw new Error('请填写邮箱');
    
    // 验证并删除验证码
    await verifyCode(formId, md5(email), emailCode, 'email');
    
    // 检查该邮箱是否已提交过
    const existingEmail = await ctx.db.collection('formData').findOne({
      formId: new ObjectId(formId),
      data: { email },
      deletedAt: null
    });
    if (existingEmail) throw new Error('该邮箱已填写过此表单');
  }

  if (form.config?.oncePerUser && submitterId) {
    const existing = await ctx.db.collection('formData').findOne({
      formId: new ObjectId(formId),
      userId: submitterId,
      deletedAt: null
    });
    if (existing) throw new Error('You have already submitted this form');
  }

  if (form.config?.oncePerGuest && userToken) {
    const existing = await ctx.db.collection('formData').findOne({
      formId: new ObjectId(formId),
      userToken,
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
    userToken: userToken || null,
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
