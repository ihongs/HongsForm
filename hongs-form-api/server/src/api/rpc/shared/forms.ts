import { ObjectId } from 'mongodb';
import { RpcContext } from '../core/types.js';
import { validate, baseValidate, formValidate } from 'hongs-form';

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
      startAt: form.config?.startAt,
      endAt: form.config?.endAt
    },
    status: form.status
  };
}

const formEntitySchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      required: true
    },
    type: {
      type: 'string',
      enum: ['form', 'survey']
    },
    title: {
      type: 'string'
    },
    description: {
      type: 'string'
    },
    schema: {
      type: 'object',
      required: true,
      properties: {},
      additionalProperties: true,
      validate: [baseValidate, formValidate]
    },
    config: {
      type: 'object',
      properties: {
        oncePerPhone: { type: 'boolean' },
        oncePerEmail: { type: 'boolean' },
        showAfterSubmit: { type: 'boolean' },
        maxSubmissions: { type: 'number' },
        startAt: { type: 'date' },
        endAt: { type: 'date' }
      }
    },
    status: { type: 'number', enum: [0, 1, 2] }
  }
};

export function validateFormCreate(params: any): any {
  return validate(params, formEntitySchema, {});
}

export function validateFormUpdate(params: any): any {
  return validate(params, formEntitySchema, {patchMode: true});
}
