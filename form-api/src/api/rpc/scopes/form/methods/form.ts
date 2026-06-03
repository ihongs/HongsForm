import { ObjectId } from 'mongodb';
import { registerFormMethod } from '../registry.js';
import { publicFormSchema } from '../../../shared/forms.js';
import { md5, verifySlideToken, checkSendRate, saveCode, generateCode } from '../../../../../utils/verify.js';

registerFormMethod('form.getCounts', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');

  const form = await ctx.db.collection('forms').findOne({
    _id: new ObjectId(id),
    deletedAt: null,
    status: 2
  });

  if (!form) throw new Error('Form not found');
  if (form.type !== 'vote') throw new Error('Only vote forms have counts');

  return {
    counts: form.counts || {},
    countedAt: form.countedAt,
    dataCount: form.dataCount || 0
  };
});

registerFormMethod('form.schema', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');

  const form = await ctx.db.collection('forms').findOne({
    _id: new ObjectId(id),
    deletedAt: null,
    status: 2
  });

  if (!form) throw new Error('Form not found');
  return publicFormSchema(form);
});

// 发送表单手机验证码
registerFormMethod('form.verify.sendSmsCode', async (params, ctx) => {
  const { formId, phone, verifyToken } = params as any;

  if (!formId || !phone || !verifyToken) {
    throw new Error('参数不完整');
  }

  // 验证滑块验证码令牌
  await verifySlideToken(verifyToken);

  // 查找表单
  const form = await ctx.db.collection('forms').findOne({
    _id: new ObjectId(formId),
    deletedAt: null,
    status: 2
  });

  if (!form) throw new Error('表单不存在');

  // 检查表单是否开启了手机号限填
  if (!form.config?.oncePerPhone) {
    throw new Error('表单未开启手机号验证');
  }

  // 检查该手机号是否已提交过此表单
  const phoneMd5Val = md5(phone);
  const existingRecord = await ctx.db.collection('formRecords').findOne({
    formId: new ObjectId(formId),
    data: { phone },
    deletedAt: null
  });

  if (existingRecord) {
    throw new Error('该手机号已填写过此表单');
  }

  // 发送频率限制
  await checkSendRate(phoneMd5Val, 'sms');

  const code = generateCode();
  await saveCode(phoneMd5Val, code, 'sms', formId);

  console.log(`[Form SMS] 表单 ${formId} 向 ${phone} 发送验证码: ${code}`);

  return {
    success: true,
    message: '验证码发送成功'
  };
});

// 发送表单邮箱验证码
registerFormMethod('form.verify.sendEmailCode', async (params, ctx) => {
  const { formId, email, verifyToken } = params as any;

  if (!formId || !email || !verifyToken) {
    throw new Error('参数不完整');
  }

  // 验证滑块验证码令牌
  await verifySlideToken(verifyToken);

  // 查找表单
  const form = await ctx.db.collection('forms').findOne({
    _id: new ObjectId(formId),
    deletedAt: null,
    status: 2
  });

  if (!form) throw new Error('表单不存在');

  // 检查表单是否开启了邮箱限填
  if (!form.config?.oncePerEmail) {
    throw new Error('表单未开启邮箱验证');
  }

  // 检查该邮箱是否已提交过此表单
  const emailMd5Val = md5(email);
  const existingRecord = await ctx.db.collection('formRecords').findOne({
    formId: new ObjectId(formId),
    data: { email },
    deletedAt: null
  });

  if (existingRecord) {
    throw new Error('该邮箱已填写过此表单');
  }

  // 发送频率限制
  await checkSendRate(emailMd5Val, 'email');

  const code = generateCode();
  await saveCode(emailMd5Val, code, 'email', formId);

  console.log(`[Form Email] 表单 ${formId} 向 ${email} 发送验证码: ${code}`);

  return {
    success: true,
    message: '验证码发送成功'
  };
});

registerFormMethod('form.checksum', async (params, ctx) => {
  const { id, checksum } = params as any;
  if (!id) throw new Error('id is required');
  if (!checksum) throw new Error('checksum is required');

  const form = await ctx.db.collection('forms').findOne({
    _id: new ObjectId(id),
    deletedAt: null
  });

  if (!form) {
    return { success: false, code: 'FORM_NOT_FOUND', message: '表单不存在' };
  }

  if (form.status !== 2) {
    return { success: false, code: 'FORM_NOT_PUBLISHED', message: '表单未发布' };
  }

  // 校验checksum
  const expectedChecksum = md5((form.createdBy?.toString() ?? '') + id);
  if (expectedChecksum !== checksum) {
    return { success: false, code: 'INVALID_CHECKSUM', message: '校验失败' };
  }

  return {
    success: true,
    form: {
      _id: form._id.toString(),
      type: form.type,
      name: form.name,
      title: form.title,
      config: {
        oncePerPhone: form.config?.oncePerPhone ?? false,
        oncePerEmail: form.config?.oncePerEmail ?? false
      },
      status: form.status
    }
  };
});
