import { ObjectId } from 'mongodb';
import { RpcContext } from '../core/types.js';

export function requireUserId(ctx: RpcContext): ObjectId {
  if (!ctx.userId) throw new Error('Unauthorized');
  return ctx.userId;
}

export function validateVoteForm(fields: any[]): void {
  const countableFields = fields.filter(f => 
    f.countable && ['select', 'check', 'radio', 'switch'].includes(f.inputType)
  );
  if (countableFields.length === 0) {
    throw new Error('投票表单必须至少有一个选项类字段（select/check/radio/switch）且开启投票计数');
  }
}

/**
 * 根据 inputType 补全/修正字段的 type 及其他相关配置
 */
export function normalizeFields(fields: any[]): any[] {
  return fields.map(field => {
    const normalized = { ...field };
    const inputType = field.inputType;

    // 根据 inputType 设置 type
    switch (inputType) {
      case 'name':
      case 'text':
      case 'textarea':
      case 'file':
      case 'image':
        normalized.type = 'string';
        break;

      case 'email':
        normalized.type = 'string';
        normalized.format = 'email';
        break;

      case 'phone':
        normalized.type = 'string';
        normalized.pattern = '^1[3-9]\\d{9}$';
        break;

      case 'select':
      case 'radio':
        // 允许 string, number, integer，默认 string
        if (!['string', 'number', 'integer'].includes(normalized.type)) {
          normalized.type = 'string';
        }
        break;

      case 'check':
        normalized.type = 'array';
        // items.type 允许 string, number, integer，默认 string
        if (!normalized.items) {
          normalized.items = { type: 'string' };
        } else if (!['string', 'number', 'integer'].includes(normalized.items.type)) {
          normalized.items = { ...normalized.items, type: 'string' };
        }
        break;

      case 'range':
        normalized.type = 'number';
        if (normalized.minimum === undefined) normalized.minimum = 0;
        if (normalized.maximum === undefined) normalized.maximum = 100;
        break;

      case 'switch':
        normalized.type = 'boolean';
        break;

      case 'datetime':
      case 'date':
      case 'time':
        normalized.type = 'number';
        break;

      case 'legend':
      case 'figure':
        normalized.type = 'null';
        break;

      default:
        // 未知的 inputType，保持原样或默认 string
        if (!normalized.type) normalized.type = 'string';
    }

    return normalized;
  });
}

export async function findOwnedForm(ctx: RpcContext, id: string): Promise<any> {
  const userId = requireUserId(ctx);
  const form = await ctx.db.collection('forms').findOne({
    _id: new ObjectId(id),
    userId,
    deletedAt: null
  });
  if (!form) throw new Error('Form not found');
  return form;
}

export function publicFormSchema(form: any): Record<string, unknown> {
  return {
    id: form._id.toString(),
    type: form.type || 'form',
    name: form.name,
    title: form.title,
    description: form.description,
    fields: form.fields,
    config: {
      oncePerPhone: form.config?.oncePerPhone,
      oncePerEmail: form.config?.oncePerEmail,
      oncePerGuest: form.config?.oncePerGuest,
      startAt: form.config?.startAt,
      endAt: form.config?.endAt
    },
    script: form.script || '',
    status: form.status
  };
}