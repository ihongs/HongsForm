import { Db, ObjectId } from 'mongodb';
import { z } from 'zod';
import { BaseModel } from './BaseModel.js';
import { toFindSchema } from '../utils/finder.js';

export const FormFieldSchema = z.object({
  type: z.enum(['string', 'number', 'integer', 'boolean', 'array', 'date', 'null']),
  inputType: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{1,10}$/),
  name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{1,10}$/),
  title: z.string(),
  description: z.string().optional(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  default: z.any().optional(),
  format: z.string().optional(),
  pattern: z.string().optional(),
  minimum: z.number().optional(),
  minimumExclusive: z.boolean().optional(),
  maximum: z.number().optional(),
  maximumExclusive: z.boolean().optional(),
  minItems: z.number().optional(),
  minItemsExclusive: z.boolean().optional(),
  maxItems: z.number().optional(),
  maxItemsExclusive: z.boolean().optional(),
  minLength: z.number().optional(),
  minLengthExclusive: z.boolean().optional(),
  maxLength: z.number().optional(),
  maxLengthExclusive: z.boolean().optional(),
  enum: z.array(z.any()).optional(),
  items: z.record(z.string(), z.any()).optional(),
  labels: z.record(z.string(), z.string()).optional(),
});

export const FormConfigSchema = z.object({
  oncePerPhone: z.boolean().optional().default(false),
  oncePerEmail: z.boolean().optional().default(false),
  oncePerGuest: z.boolean().optional().default(false),
  showAfterSubmit: z.boolean().optional().default(false),
  maxSubmissions: z.number().optional().nullable(),
  startAt: z.date().optional().nullable(),
  endAt: z.date().optional().nullable(),
});

export const FormSchema = z.object({
  userId: z.custom<ObjectId>((val) => val instanceof ObjectId),
  name: z.string(),
  type: z.enum(['form', 'vote']).default('form'),
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  config: FormConfigSchema.optional(),
  fields: z.array(FormFieldSchema).min(1),
  script: z.string().optional().nullable(),
  status: z.number().int().min(0).max(2).default(1),
  publishedAt: z.date().optional().nullable(),
  dataCount: z.number().optional().default(0),
});

export const FormCreateSchema = FormSchema.omit({ publishedAt: true, dataCount: true });
export const FormUpdateSchema = FormSchema.partial().omit({ userId: true });

export const FormFindSchema = toFindSchema(FormSchema, ['userId', 'name', 'type', 'status', 'createdAt', 'publishedAt']);

export class FormModel extends BaseModel {
  constructor(db: Db) {
    super(db, 'forms', {
      createSchema: FormCreateSchema,
      updateSchema: FormUpdateSchema,
      findSchema: FormFindSchema,
    });
  }

  async create(data: any): Promise<any> {
    const dataWithDefaults = {
      ...data,
      config: {
        oncePerPhone: false,
        oncePerEmail: false,
        oncePerGuest: false,
        showAfterSubmit: false,
        ...data.config,
      },
    };
    return super.create(dataWithDefaults);
  }
}
