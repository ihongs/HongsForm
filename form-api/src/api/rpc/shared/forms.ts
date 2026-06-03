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