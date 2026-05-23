import { ObjectId } from 'mongodb';
import { RpcContext } from '../core/types.js';

export function requireUserId(ctx: RpcContext): ObjectId {
  if (!ctx.userId) throw new Error('Unauthorized');
  return ctx.userId;
}

export async function findOwnedForm(ctx: RpcContext, id: string): Promise<any> {
  const userId = requireUserId(ctx);
  const form = await ctx.db.collection('form').findOne({
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
    icon: form.icon,
    color: form.color,
    schema: form.schema,
    config: {
      anonymous: form.config?.anonymous,
      startAt: form.config?.startAt,
      endAt: form.config?.endAt
    },
    status: form.status
  };
}
