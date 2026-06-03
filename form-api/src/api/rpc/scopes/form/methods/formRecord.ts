import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { registerFormMethod } from '../registry.js';
import { generateDataHash } from '../../../shared/formRecords.js';
import { md5, verifyCode } from '../../../../../utils/verify.js';
import { wrapError } from '../../../../../utils/finder.js';
import { dataFieldsToSchema } from '../../../../../schemas/formRecord.js';

function buildCountUpdate(data: any, fields: any[]): any {
  const update: any = {};
  const countableFields = fields.filter(f => 
    f.countable && ['select', 'check', 'radio', 'switch'].includes(f.inputType)
  );

  countableFields.forEach(field => {
    const fieldValue = data[field.name];
    if (fieldValue === undefined || fieldValue === null) return;

    if (field.inputType === 'check' && Array.isArray(fieldValue)) {
      fieldValue.forEach((val: any) => {
        const key = `counts.${field.name}.${String(val)}`;
        update[key] = 1;
      });
    } else {
      const key = `counts.${field.name}.${String(fieldValue)}`;
      update[key] = 1;
    }
  });

  return update;
}

// 检查访客是否已提交过此表单
registerFormMethod('formRecord.checkSubmitted', async (params, ctx) => {
  const { formId, userToken } = params as any;
  if (!formId) throw new Error('Form ID is required');
  if (!userToken) throw new Error('User token is required');

  const form = await ctx.db.collection('forms').findOne({
    _id: new ObjectId(formId),
    deletedAt: null,
    status: 2
  });

  if (!form) throw new Error('Form not found');

  if (!form.config?.oncePerGuest) {
    return { submitted: false };
  }

  const existing = await ctx.db.collection('formRecords').findOne({
    formId: new ObjectId(formId),
    userToken,
    deletedAt: null
  });

  return { submitted: !!existing };
});

registerFormMethod('formRecord.create', async (params, ctx) => {
  const { formId, data, channel = 'web', userIp, userAgent, userToken, phoneCode, emailCode } = params as any;
  const submitterId = ctx.userId ?? null;
  if (!formId) throw new Error('Form ID is required');
  if (!data) throw new Error('Form data is required');

  const form = await ctx.db.collection('forms').findOne({
    _id: new ObjectId(formId),
    deletedAt: null,
    status: 2
  });

  if (!form) throw new Error('Form not found');

  // 校验表单数据并给错误附加 deta 层级
  let validatedData;
  try {
    validatedData = dataFieldsToSchema(form.fields).parse(data);
  } catch (er) {
    if (er instanceof z.ZodError) {
      throw wrapError(er, ['data']);
    }
    throw er
  }

  if (form.config?.oncePerUser && submitterId) {
    const existing = await ctx.db.collection('formRecords').findOne({
      formId: new ObjectId(formId),
      userId: submitterId,
      deletedAt: null
    });
    if (existing) throw new Error('You have already submitted this form');
  }

  if (form.config?.oncePerGuest && userToken) {
    const existing = await ctx.db.collection('formRecords').findOne({
      formId: new ObjectId(formId),
      userToken,
      deletedAt: null
    });
    if (existing) throw new Error('You have already submitted this form');
  }

  // 验证手机验证码
  if (form.config?.oncePerPhone) {
    const phone = validatedData.phone;
    if (!phone) throw new Error('请填写手机号');
    
    // 验证并删除验证码
    try {
      await verifyCode(md5(phone as string), phoneCode, 'sms', formId);
    } catch (er) {
      if (er instanceof Error) {
        throw { message: er.message, errors: {phone: er.message} };
      }
      throw er;
    }
    
    // 检查该手机号是否已提交过
    const existingPhone = await ctx.db.collection('formRecords').findOne({
      formId: new ObjectId(formId),
      data: { phone },
      deletedAt: null
    });
    if (existingPhone) throw { message: '该手机号已填写过此表单', errors: {phone: '该手机号已填写过此表单'} };
  }

  // 验证邮箱验证码
  if (form.config?.oncePerEmail) {
    const email = validatedData.email;
    if (!email) throw new Error('请填写邮箱');
    
    // 验证并删除验证码
    try {
      await verifyCode(md5(email as string), emailCode, 'email', formId);
    } catch (er) {
      if (er instanceof Error) {
        throw { message: er.message, errors: {email: er.message} };
      }
      throw er;
    }
    
    // 检查该邮箱是否已提交过
    const existingEmail = await ctx.db.collection('formRecords').findOne({
      formId: new ObjectId(formId),
      data: { email },
      deletedAt: null
    });
    if (existingEmail) throw { message: '该邮箱已填写过此表单', errors: {email: '该邮箱已填写过此表单'} };
  }

  const dataHash = generateDataHash(formId, submitterId?.toString() ?? null, validatedData);

  const now = new Date();
  const result = await ctx.db.collection('formRecords').insertOne({
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

  await ctx.db.collection('forms').updateOne(
    { _id: new ObjectId(formId) },
    { $inc: { dataCount: 1 } }
  );

  // 如果是投票表单，更新 counts 统计数据
  let counts = null;
  if (form.type === 'vote') {
    const countUpdate = buildCountUpdate(validatedData, form.fields);
    if (Object.keys(countUpdate).length > 0) {
      const updateResult = await ctx.db.collection('forms').findOneAndUpdate(
        { _id: new ObjectId(formId) },
        { 
          $inc: countUpdate,
          $set: { countedAt: now }
        },
        { returnDocument: 'after' }
      );
      counts = updateResult?.value?.counts;
    }
  }

  // 如果是签到表单，返回 checksum
  let checksum = null;
  if (form.type === 'sign') {
    const recordId = result.insertedId.toString();
    checksum = md5(now.toISOString() + recordId);
  }

  return{ id: result.insertedId.toString(), counts, checksum };
});

registerFormMethod('formRecord.checksum', async (params, ctx) => {
  const { id, checksum } = params as any;
  if (!id) throw new Error('id is required');
  if (!checksum) throw new Error('checksum is required');

  const record = await ctx.db.collection('formRecords').findOne({
    _id: new ObjectId(id),
    deletedAt: null
  });

  if (!record) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: '记录不存在' };
  }

  const form = await ctx.db.collection('forms').findOne({
    _id: record.formId,
    deletedAt: null
  });

  if (!form) {
    return { success: false, code: 'FORM_NOT_FOUND', message: '表单不存在' };
  }

  // 校验checksum
  const expectedChecksum = md5(record.createdAt.toISOString() + id);
  if (expectedChecksum !== checksum) {
    return { success: false, code: 'INVALID_CHECKSUM', message: '校验失败' };
  }

  const currentUserId = ctx.userId;
  const isAgent = form.createdBy?.toString() === currentUserId?.toString();

  return {
    success: true,
    record: {
      _id: record._id.toString(),
      data: record.data,
      status: record.status,
      createdAt: record.createdAt
    },
    form: {
      _id: form._id.toString(),
      type: form.type,
      name: form.name,
      title: form.title,
      config: {
        signWord: form.config?.signWord
      }
    },
    isAgentMode: isAgent
  };
});

registerFormMethod('formRecord.signByPhone', async (params, ctx) => {
  const { formId, phone, verifyCode: code } = params as any;
  if (!formId) throw new Error('formId is required');
  if (!phone) throw new Error('phone is required');
  if (!code) throw new Error('verifyCode is required');

  const form = await ctx.db.collection('forms').findOne({
    _id: new ObjectId(formId),
    deletedAt: null,
    status: 2
  });

  if (!form) {
    return { success: false, code: 'FORM_NOT_FOUND', message: '表单不存在' };
  }

  if (!form.config?.oncePerPhone) {
    return { success: false, code: 'NOT_ALLOWED', message: '未开启手机号签到' };
  }

  // 验证验证码
  try {
    await verifyCode(md5(phone), code, 'sms', formId);
  } catch (er) {
    return { success: false, code: 'INVALID_CODE', message: '验证码错误' };
  }

  // 查找记录
  const record = await ctx.db.collection('formRecords').findOne({
    formId: new ObjectId(formId),
    'data.phone': phone,
    deletedAt: null
  });

  if (!record) {
    return { success: false, code: 'NOT_REGISTERED', message: '请先报名' };
  }

  // 检查是否已签到
  const isFirstSign = record.status !== 2;
  if (isFirstSign) {
    await ctx.db.collection('formRecords').updateOne(
      { _id: record._id },
      { $set: { status: 2, signedAt: new Date() } }
    );
  }

  const recordId = record._id.toString();
  const checksum = md5(record.createdAt.toISOString() + recordId);

  return {
    success: true,
    id: recordId,
    isFirstSign,
    checksum
  };
});

registerFormMethod('formRecord.signByEmail', async (params, ctx) => {
  const { formId, email, verifyCode: code } = params as any;
  if (!formId) throw new Error('formId is required');
  if (!email) throw new Error('email is required');
  if (!code) throw new Error('verifyCode is required');

  const form = await ctx.db.collection('forms').findOne({
    _id: new ObjectId(formId),
    deletedAt: null,
    status: 2
  });

  if (!form) {
    return { success: false, code: 'FORM_NOT_FOUND', message: '表单不存在' };
  }

  if (!form.config?.oncePerEmail) {
    return { success: false, code: 'NOT_ALLOWED', message: '未开启邮箱签到' };
  }

  // 验证验证码
  try {
    await verifyCode(md5(email), code, 'email', formId);
  } catch (er) {
    return { success: false, code: 'INVALID_CODE', message: '验证码错误' };
  }

  // 查找记录
  const record = await ctx.db.collection('formRecords').findOne({
    formId: new ObjectId(formId),
    'data.email': email,
    deletedAt: null
  });

  if (!record) {
    return { success: false, code: 'NOT_REGISTERED', message: '请先报名' };
  }

  // 检查是否已签到
  const isFirstSign = record.status !== 2;
  if (isFirstSign) {
    await ctx.db.collection('formRecords').updateOne(
      { _id: record._id },
      { $set: { status: 2, signedAt: new Date() } }
    );
  }

  const recordId = record._id.toString();
  const checksum = md5(record.createdAt.toISOString() + recordId);

  return {
    success: true,
    id: recordId,
    isFirstSign,
    checksum
  };
});