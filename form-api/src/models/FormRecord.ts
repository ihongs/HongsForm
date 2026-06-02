import { Db, ObjectId } from 'mongodb';
import { z } from 'zod';
import { BaseModel } from './BaseModel.js';
import { toFindSchema } from '../utils/finder.js';

export const FormRecordSchema = z.object({
  formId: z.custom<ObjectId>((val) => val instanceof ObjectId),
  userId: z.custom<ObjectId>((val) => val instanceof ObjectId).optional().nullable(),
  data: z.record(z.string(), z.any()),
  dataHash: z.string(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  userIp: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  userToken: z.string().optional().nullable(),
  channel: z.string().optional().default('web'),
  status: z.number().int().min(0).max(1).default(1),
});

export const FormRecordCreateSchema = FormRecordSchema;
export const FormRecordUpdateSchema = FormRecordSchema.partial().omit({ formId: true, dataHash: true });

export const FormRecordFindSchema = toFindSchema(FormRecordSchema, ['formId', 'userId', 'phone', 'email', 'userToken', 'channel', 'status', 'createdAt']);

export class FormRecordModel extends BaseModel {
  constructor(db: Db) {
    super(db, 'formRecords', {
      createSchema: FormRecordCreateSchema,
      updateSchema: FormRecordUpdateSchema,
      findSchema: FormRecordFindSchema,
    });
  }
}

// 字段集合转 Zod schema
export function dataFieldsToSchema(fields: any[]) {
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
