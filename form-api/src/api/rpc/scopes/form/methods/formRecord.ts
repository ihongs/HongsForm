import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { registerFormMethod } from '../registry.js';
import { generateDataHash } from '../../../shared/formRecords.js';
import { md5, verifyCode } from '../../../../../utils/verify.js';

// 字段集合转 Zod schema
const fields2Zod = function (fields: any) {
    const shape: any = {};
    for (const field of fields) {
        // 构建 schema
        let schema: any;
        
        if (field.type === 'array') {
            // 数组类型
            let itemSchema: any = z.any();
            if (field.items?.enum) {
                itemSchema = z.enum(field.items.enum as [string, ...string[]]);
            }
            schema = z.array(itemSchema);
            
            // 数组长度校验
            if (field.minItems) {
                schema = schema.min(field.minItems);
            }
            if (field.maxItems) {
                schema = schema.max(field.maxItems);
            }
        } else if (field.type === 'number' || field.type === 'integer') {
            // 数字类型
            schema = z.number();
            if (field.minimum) {
                schema = schema.min(field.minimum);
            }
            if (field.maximum) {
                schema = schema.max(field.maximum);
            }
            if (field.type === 'integer') {
                schema = schema.int();
            }
        } else if (field.type === 'boolean') {
            // 布尔类型
            schema = z.boolean();
        } else if (field.type === 'string') {
            // 字符串类型
            if (field.format === 'date' || field.format === 'date-time') {
                schema = z.coerce.date();
            } else {
                schema = z.string();
                
                if (field.format === 'email') {
                    schema = schema.email();
                }
                
                if (field.minLength) {
                    schema = schema.min(field.minLength);
                }
                if (field.maxLength) {
                    schema = schema.max(field.maxLength);
                }
                
                if (field.pattern) {
                    schema = schema.regex(new RegExp(field.pattern));
                }
                
                if (field.enum) {
                    schema = z.enum(field.enum as [string, ...string[]]);
                }
            }
        } else if (field.type === 'date') {
            schema = z.coerce.date();
        } else {
            schema = z.any();
        }
        
        // 非必填转 optional
        if (!field.required) {
            schema = schema.optional().nullable();
        }
        
        shape[field.name] = schema;
    }
    return z.object(shape).strict();
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

  const validatedData = fields2Zod(form.fields).parse(data);

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

  return { id: result.insertedId.toString() };
});