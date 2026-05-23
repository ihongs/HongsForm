import { ObjectId } from 'mongodb';
import { registerFormMethod } from '../registry.js';
import { publicFormSchema } from '../../../shared/forms.js';

registerFormMethod('form.schema', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');

  const form = await ctx.db.collection('form').findOne({
    _id: new ObjectId(id),
    deletedAt: null,
    status: 2
  });

  if (!form) throw new Error('Form not found');
  return publicFormSchema(form);
});
