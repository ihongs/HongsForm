/**
 * 查找助手
 * @author Hongs
 */

import { z, ZodObject, ZodError, ZodTypeAny } from "zod";
import { ObjectId } from "mongodb";

function getInnerType(schema: ZodTypeAny): ZodTypeAny {
  const def = schema.def as any;
  if (def.innerType) return getInnerType(def.innerType);
  return schema;
}

function getArrayType(schema: ZodTypeAny): ZodTypeAny | null {
  if (schema instanceof z.ZodArray) {
    return schema.element as ZodTypeAny;
  }
  const def = schema.def as any;
  if (def.elementType) return def.elementType;
  return null;
}

function toCoerce(fieldType: ZodTypeAny, fieldName: string): ZodTypeAny {
  const current = getInnerType(fieldType);

  const def = current.def as any;

  if (current instanceof z.ZodDate) {
    return def.coerce ? fieldType : z.coerce.date();
  }

  if (current instanceof z.ZodNumber) {
    return def.coerce ? fieldType : z.coerce.number();
  }

  if (fieldName === "_id" || fieldName.endsWith("Id")) {
    return z.preprocess(
      (val) => typeof val === "string" && ObjectId.isValid(val)
        ? new ObjectId(val)
        : val,
      z.instanceof(ObjectId)
    );
  }

  return fieldType;
}

function toType(fieldType: string): ZodTypeAny {
  switch (fieldType.toLowerCase()) {
    case 'date':
      return z.coerce.date();
    case 'number':
      return z.coerce.number();
    case 'boolean':
      return z.coerce.boolean();
    case 'string':
    default:
      return z.string();
  }
}

function allows(
  allowFields: string[],
  modelFields: Record<string, ZodTypeAny>
): {
  finalFields: string[];
  extraFields: Record<string, ZodTypeAny>
} {
  const hasPrefix = allowFields.some( f => f.startsWith('+') || f.startsWith('-') );
  const finalFields = hasPrefix ? new Set(Object.keys(modelFields)) : new Set<string>();
  const extraFields : Record<string, ZodTypeAny> = {};

  for (const field of allowFields) {
    if (field.startsWith('+')) {
      const trimmed = field.slice(1);
      const p = trimmed.indexOf(':');
      if (p > 0) {
        const fieldName = trimmed.slice(0 , p);
        const fieldType = trimmed.slice(p + 1);
        extraFields[fieldName] = toType(fieldType);
      } else if (modelFields[trimmed]) {
        finalFields.add(trimmed);
      } else {
        extraFields[trimmed] = z.string();
      }
    } else
    if (field.startsWith('-')) {
      const fieldName = field.slice(1);
      finalFields.delete(fieldName);
      delete extraFields[fieldName];
    } else {
      if (modelFields[field]) {
        finalFields.add(field);
      }
    }
  }

  return { extraFields, finalFields: Array.from(finalFields) };
}

export function toFindSchema<T extends ZodObject<Record<string, ZodTypeAny>>>(
  modelSchema: T,
  allowFields?: string[]
) {
  const modelFields = modelSchema.shape;
  let extraFields: Record<string, ZodTypeAny> = {};
  let finalFields: string[];

  if (allowFields && allowFields.length > 0) {
    const result = allows(allowFields, modelFields);
    extraFields = result.extraFields;
    finalFields = result.finalFields;
  } else {
    finalFields = Object.keys(modelFields);
  }

  const fieldShape: Record<string, ZodTypeAny> = {};

  for (const key of finalFields) {
    let fieldType = modelFields[key];
    if (!fieldType && modelFields[key]) {
      fieldType = modelFields[key];
    }
    if (!fieldType) {
      continue;
    }

    const coerce = toCoerce(fieldType, key);
    const innerType = getInnerType(fieldType);
    const arrayType = getArrayType(innerType);
    const valueType = arrayType ? arrayType : coerce;

    const operatorSchema = z.object({
      $gt : coerce.optional(),
      $gte: coerce.optional(),
      $lt : coerce.optional(),
      $lte: coerce.optional(),
      $ne : coerce.optional(),
      $in : z.array(valueType).optional(),
      $nin: z.array(valueType).optional(),
      $all: z.array(valueType).optional(),
      $exists: z.boolean().optional(),
    });

    fieldShape[key] = z.union([coerce, operatorSchema]).optional();
  }

  for (const [key, fieldType] of Object.entries(extraFields)) {
    const coerce = toCoerce(fieldType, key);
    const innerType = getInnerType(fieldType);
    const arrayType = getArrayType(innerType);
    const valueType = arrayType ? arrayType : coerce;

    const operatorSchema = z.object({
      $gt : coerce.optional(),
      $gte: coerce.optional(),
      $lt : coerce.optional(),
      $lte: coerce.optional(),
      $ne : coerce.optional(),
      $in : z.array(valueType).optional(),
      $nin: z.array(valueType).optional(),
      $all: z.array(valueType).optional(),
      $exists: z.boolean().optional(),
    });

    fieldShape[key] = z.union([coerce, operatorSchema]).optional();
  }

  return z.object(fieldShape).partial().strip();
}

export function wrapError(err: ZodError, parentPath: (string | number)[]) {
  return new ZodError(
    err.issues.map(issue => ({
      ...issue,
      path: [...parentPath, ...issue.path],
    }))
  );
}

export function findParse(
  data: unknown,
  fieldSchema: ZodTypeAny,
  maxDepth: number = 3,
  path: (string | number)[] = []
): unknown {
  if (maxDepth <= 0) {
    throw new ZodError([{
      code: "custom",
      message: "findParse: depth exceeds limit",
      path,
    }]);
  }

  if (typeof data !== "object" || data === null) {
    return fieldSchema.parse(data);
  }

  const record = data as Record<string, unknown>;

  const result: Record<string, unknown> = {};
  const filteredData: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(record)) {
    if (key === "$or" || key === "$and" || key === "$nor") {
      if (!Array.isArray(val)) {
        throw new ZodError([{
          code: "custom",
          message: `findParse: ${key} must be array`,
          path: [...path, key],
        }]);
      }
      result[key] = val.map((item, i) =>
        findParse(item, fieldSchema, maxDepth - 1, [...path, key, i])
      );
      continue;
    }

    if (key === "$not") {
      result[key] = findParse(val, fieldSchema, maxDepth - 1, [...path, key]);
      continue;
    }

    if (key.includes(".")) {
      result[key] = val;
      continue;
    }

    filteredData[key] = val;
  }

  const parsed = fieldSchema.safeParse(filteredData);
  if (!parsed.success) throw wrapError(parsed.error, path);

  Object.assign(result, parsed.data);

  return result;
}
