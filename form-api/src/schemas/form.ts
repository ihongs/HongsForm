import { z } from 'zod';

export const fieldSchema = z.object({
  name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{1,10}$/, 'name 须以字母开头，可包含字母、数字、下划线，长度 2-11'),
  inputType: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{1,10}$/, 'inputType 须以字母开头，可包含字母、数字、下划线，长度 2-11'),
  type: z.enum(['string', 'number', 'integer', 'boolean', 'array', 'date', 'null']).optional(),
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
  labels: z.record(z.string(), z.string()).optional()
});

export const configSchema = z.object({
  oncePerPhone: z.boolean().optional(),
  oncePerEmail: z.boolean().optional(),
  oncePerGuest: z.boolean().optional(),
  showAfterSubmit: z.boolean().optional(),
  maxSubmissions: z.number().optional(),
  startAt: z.string().datetime().nullable().optional(),
  endAt: z.string().datetime().nullable().optional()
});

export const formSchema = z.object({
  name: z.string(),
  type: z.enum(['form', 'survey']).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(fieldSchema).min(1),
  config: configSchema.optional(),
  script: z.string().nullable().optional(),
  status: z.number().int().min(0).max(2).optional()
});

export const formCreateSchema = formSchema;

export const formUpdateSchema = formSchema.partial().extend({
  id: z.string()
});
