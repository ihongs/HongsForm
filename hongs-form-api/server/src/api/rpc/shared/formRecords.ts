import { ObjectId } from 'mongodb';
import { createHash } from 'node:crypto';
import { RpcContext } from '../core/types.js';
import { requireUserId } from './forms.js';

export function generateDataHash(formId: string, userId: string | null, data: object): string {
  const str = `${formId}:${userId || ''}:${JSON.stringify(data)}`;
  return createHash('sha256').update(str).digest('hex');
}

export async function requireOwnedForm(ctx: RpcContext, formId: string): Promise<any> {
  const userId = requireUserId(ctx);
  const form = await ctx.db.collection('forms').findOne({
    _id: new ObjectId(formId),
    userId,
    deletedAt: null
  });
  if (!form) throw new Error('Form not found');
  return form;
}

export async function requireOwnedFormData(ctx: RpcContext, id: string): Promise<any> {
  const userId = requireUserId(ctx);
  const item = await ctx.db.collection('formRecords').aggregate([
    { $match: { _id: new ObjectId(id), deletedAt: null } },
    {
      $lookup: {
        from: 'form',
        localField: 'formId',
        foreignField: '_id',
        as: 'form'
      }
    },
    { $unwind: '$form' },
    { $match: { 'form.userId': userId, 'form.deletedAt': null } },
    { $project: { form: 0 } }
  ]).next();

  if (!item) throw new Error('Data not found');
  return item;
}
