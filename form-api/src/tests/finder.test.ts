import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { toFindSchema, findParse, wrapError } from '../utils/finder.js';

test('toFindSchema: should create a find schema from a simple zod object', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });
  
  const findSchema = toFindSchema(schema);
  
  assert.ok(findSchema);
  assert.strictEqual(typeof findSchema.parse, 'function');
});

test('toFindSchema: should accept basic field values', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });
  
  const findSchema = toFindSchema(schema);
  
  const result = findSchema.parse({
    name: 'test',
    age: 25,
  });
  
  assert.deepStrictEqual(result, {
    name: 'test',
    age: 25,
  });
});

test('toFindSchema: should accept operator expressions', () => {
  const schema = z.object({
    age: z.number(),
  });
  
  const findSchema = toFindSchema(schema);
  
  const result = findSchema.parse({
    age: { $gt: 18, $lt: 100 },
  });
  
  assert.deepStrictEqual(result, {
    age: { $gt: 18, $lt: 100 },
  });
});

test('toFindSchema: should accept array operators like $in', () => {
  const schema = z.object({
    tags: z.array(z.string()),
  });
  
  const findSchema = toFindSchema(schema);
  
  const result = findSchema.parse({
    tags: { $in: ['a', 'b', 'c'] },
  });
  
  assert.deepStrictEqual(result, {
    tags: { $in: ['a', 'b', 'c'] },
  });
});

test('toFindSchema: should respect allowFields parameter for field selection', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
  });
  
  const findSchema = toFindSchema(schema, ['name', 'email']);
  
  const result = findSchema.parse({
    name: 'test',
    email: 'test@example.com',
  });
  
  assert.deepStrictEqual(result, {
    name: 'test',
    email: 'test@example.com',
  });
});

test('toFindSchema: should handle + prefix to add fields', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });
  
  const findSchema = toFindSchema(schema, ['name', '+extra:string']);
  
  const result = findSchema.parse({
    name: 'test',
    extra: 'value',
  });
  
  assert.deepStrictEqual(result, {
    name: 'test',
    extra: 'value',
  });
});

test('toFindSchema: should handle - prefix to remove fields', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string(),
  });
  
  const findSchema = toFindSchema(schema, ['-email']);
  
  const result = findSchema.parse({
    name: 'test',
    age: 25,
  });
  
  assert.deepStrictEqual(result, {
    name: 'test',
    age: 25,
  });
});

test('toFindSchema: should handle date coercion', () => {
  const schema = z.object({
    createdAt: z.date(),
  });
  
  const findSchema = toFindSchema(schema);
  
  const result = findSchema.parse({
    createdAt: '2024-01-01',
  });
  
  assert.ok(result.createdAt instanceof Date);
});

test('toFindSchema: should handle _id and fields ending with Id for ObjectId coercion', () => {
  const schema = z.object({
    _id: z.any(),
    userId: z.any(),
  });
  
  const findSchema = toFindSchema(schema);
  
  const validId = new ObjectId().toString();
  
  const result = findSchema.parse({
    _id: validId,
    userId: validId,
  });
  
  assert.ok(result._id instanceof ObjectId);
  assert.ok(result.userId instanceof ObjectId);
});

test('findParse: should parse simple query objects', () => {
  const schema = z.object({
    name: z.string(),
  });
  const findSchema = toFindSchema(schema);
  
  const result = findParse({ name: 'test' }, findSchema);
  
  assert.deepStrictEqual(result, { name: 'test' });
});

test('findParse: should handle $or operator', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });
  const findSchema = toFindSchema(schema);
  
  const result = findParse({
    $or: [
      { name: 'test' },
      { age: 25 },
    ],
  }, findSchema);
  
  assert.deepStrictEqual(result, {
    $or: [
      { name: 'test' },
      { age: 25 },
    ],
  });
});

test('findParse: should handle $and operator', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });
  const findSchema = toFindSchema(schema);
  
  const result = findParse({
    $and: [
      { name: 'test' },
      { age: { $gt: 18 } },
    ],
  }, findSchema);
  
  assert.deepStrictEqual(result, {
    $and: [
      { name: 'test' },
      { age: { $gt: 18 } },
    ],
  });
});

test('findParse: should handle $not operator', () => {
  const schema = z.object({
    name: z.string(),
  });
  const findSchema = toFindSchema(schema);
  
  const result = findParse({
    $not: { name: 'test' },
  }, findSchema);
  
  assert.deepStrictEqual(result, {
    $not: { name: 'test' },
  });
});

test('findParse: should handle dot notation fields', () => {
  const schema = z.object({
    user: z.object({
      name: z.string(),
    }),
  });
  const findSchema = toFindSchema(schema);
  
  const result = findParse({
    'user.name': 'test',
  }, findSchema);
  
  assert.deepStrictEqual(result, {
    'user.name': 'test',
  });
});

test('findParse: should throw error when max depth is exceeded', () => {
  const schema = z.object({
    name: z.string(),
  });
  const findSchema = toFindSchema(schema);
  
  assert.throws(() => {
    findParse({
      $or: [
        { $or: [{ $or: [{ $or: [{ name: 'test' }] }] }] },
      ],
    }, findSchema, 3);
  }, 'findParse: depth exceeds limit');
});

test('findParse: should throw error when $or is not an array', () => {
  const schema = z.object({
    name: z.string(),
  });
  const findSchema = toFindSchema(schema);
  
  assert.throws(() => {
    findParse({ $or: { name: 'test' } }, findSchema);
  }, 'findParse: $or must be array');
});

test('wrapError: should wrap zod error with parent path', () => {
  const schema = z.object({
    name: z.string(),
  });
  
  const result = schema.safeParse({ name: 123 });
  
  assert.strictEqual(result.success, false);
  
  if (!result.success) {
    const wrapped = wrapError(result.error, ['parent', 'path']);
    
    assert.ok(wrapped.issues.length > 0);
    assert.deepStrictEqual(wrapped.issues[0].path, ['parent', 'path', 'name']);
  }
});

