import { describe, it, expect } from 'vitest';
import {
  validate,
  baseValidate,
  validateForm,
  validateFind,
  validateSqls,
  optional,
  required,
  requires,
  isString,
  isNumber,
  isInteger,
  isBoolean,
  isArray,
  isObject,
  isDateTime,
  isInput,
  VPASS,
  VQUIT,
  VError,
  verifies,
  defaults,
  type FormSchema,
  type FormConfig,
  type Translator,
  VState,
} from '../src';
import { formStruct } from '../src/validates.js';

// 中文翻译器用于测试
const zhTranslator: Translator = (key: string, params?: Record<string, unknown>) => {
  const zhMessages: Record<string, string> = {
    required: '必填项',
    number: '必须是数字',
    integer: '必须是整数',
    boolean: '必须是布尔值',
    array: '必须是数组',
    object: '必须是对象',
    pattern: '格式不正确',
    format: '未知格式: {value}',
    date: '日期格式不正确',
    enum: '必须是允许的值之一',
    items: '部分项无效',
    properties: '部分属性无效',
    minimum: '最小值是 {value}',
    maximum: '最大值是 {value}',
    exclusiveMinimum: '必须大于 {value}',
    exclusiveMaximum: '必须小于 {value}',
    minLength: '最小长度是 {value}',
    maxLength: '最大长度是 {value}',
    minItems: '至少 {value} 项',
    maxItems: '最多 {value} 项',
    uniqueItems: '存在重复项',
    additionalItems: '不允许额外的项',
    minProperties: '至少 {value} 个属性',
    maxProperties: '最多 {value} 个属性',
    additionalProperties: '不允许额外的属性',
    requires: '必填项: {value}',
  };
  let message = zhMessages[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      message = message.replace(`{${k}}`, String(v));
    }
  }
  return message;
};

// ==============================================
// 第 1 阶段：基础类型与常量测试
// ==============================================

describe('第 1 阶段：VPASS/VQUIT', () => {
  it('VPASS 不能被 JSON 序列化或转成字符串', () => {
    expect(() => JSON.stringify(VPASS)).toThrow('VPASS cannot be serialized');
    expect(() => String(VPASS)).toThrow('VPASS cannot be converted');
  });

  it('VQUIT 不能被 JSON 序列化或转成字符串', () => {
    expect(() => JSON.stringify(VQUIT)).toThrow('VQUIT cannot be serialized');
    expect(() => `${VQUIT}`).toThrow('VQUIT cannot be converted');
  });
});

describe('第 1 阶段：optional 选填校验', () => {
  it('undefined 返回 VQUIT，跳过后续校验', () => {
    expect(optional(undefined, {}, {})).toBe(VQUIT);
  });

  it('null 和空字符串不退出，交给后续类型校验处理', () => {
    expect(optional(null, {}, {})).toBeNull();
    expect(optional('', {}, {})).toBe('');
  });
});

describe('第 1 阶段：required 必填校验', () => {
  it('undefined 抛 VError，key 是 "required"', () => {
    const schema = { required: true };
    try {
      required(undefined, schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.key).toBe('required');
    }
  });

  it('null 抛 VError，key 是 "required"', () => {
    const schema = { required: true };
    try {
      required(null, schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.key).toBe('required');
    }
  });

  it('空字符串抛 VError，key 是 "required"', () => {
    const schema = { required: true };
    try {
      required('', schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.key).toBe('required');
    }
  });

  it('空数组抛 VError，key 是 "required"', () => {
    const schema = { required: true };
    try {
      required([], schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.key).toBe('required');
    }
  });

  it('空对象抛 VError，key 是 "required"', () => {
    const schema = { required: true };
    try {
      required({}, schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.key).toBe('required');
    }
  });

  it('patchMode 下 undefined 返回 VQUIT，不抛异常', () => {
    const schema = { required: true };
    expect(required(undefined, schema, { patchMode: true })).toBe(VQUIT);
  });

  it('patchMode 下 null 仍抛异常', () => {
    const schema = { required: true };
    expect(() => required(null, schema, { patchMode: true })).toThrow();
  });
});

// ==============================================
// 第 2 阶段：基础类型校验与转换
// ==============================================

describe('第 2 阶段：isString 字符串校验与转换', () => {
  it('null/undefined/空字符串不处理', () => {
    expect(isString(null, {}, {})).toBeNull();
    expect(isString(undefined, {}, {})).toBeUndefined();
    expect(isString('', {}, {})).toBe('');
  });

  it('非字符串自动转字符串', () => {
    expect(isString(123, {}, {})).toBe('123');
    expect(isString(true, {}, {})).toBe('true');
  });

  it('enum 枚举校验', () => {
    const schema = { enum: ['a', 'b', 'c'] };
    expect(isString('a', schema, {})).toBe('a');
    expect(() => isString('d', schema, {})).toThrow();
  });

  it('minLength 最小长度校验', () => {
    const schema = { minLength: 3 };
    expect(isString('abc', schema, {})).toBe('abc');
    expect(() => isString('ab', schema, {})).toThrow();
  });

  it('maxLength 最大长度校验', () => {
    const schema = { maxLength: 3 };
    expect(isString('abc', schema, {})).toBe('abc');
    expect(() => isString('abcd', schema, {})).toThrow();
  });

  it('pattern 正则校验', () => {
    const schema = { pattern: '^\\d+$' };
    expect(isString('123', schema, {})).toBe('123');
    expect(() => isString('abc', schema, {})).toThrow();
  });

  it('format 格式校验（使用内置 patterns）', () => {
    const schema = { format: 'email' };
    expect(isString('test@example.com', schema, {})).toBe('test@example.com');
    expect(() => isString('not-email', schema, {})).toThrow();
  });

  it('pattern 优先于 format', () => {
    const schema = { format: 'email', pattern: '^abc$' };
    expect(isString('abc', schema, {})).toBe('abc');
    expect(() => isString('test@example.com', schema, {})).toThrow();
  });

  it('未知 format 抛异常', () => {
    const schema = { format: 'unknown-format' };
    expect(() => isString('abc', schema, {})).toThrow();
  });
});

describe('第 2 阶段：isNumber 数字校验与转换', () => {
  it('null/undefined 不处理', () => {
    expect(isNumber(null, {}, {})).toBeNull();
    expect(isNumber(undefined, {}, {})).toBeUndefined();
  });

  it('非数字自动转数字', () => {
    expect(isNumber('123', {}, {})).toBe(123);
    expect(isNumber('123.45', {}, {})).toBe(123.45);
  });

  it('无法转换的字符串抛异常', () => {
    expect(() => isNumber('not-a-number', {}, {})).toThrow();
  });

  it('minimum 最小值校验', () => {
    const schema = { minimum: 10 };
    expect(isNumber(10, schema, {})).toBe(10);
    expect(isNumber(15, schema, {})).toBe(15);
    expect(() => isNumber(9, schema, {})).toThrow();
  });

  it('maximum 最大值校验', () => {
    const schema = { maximum: 100 };
    expect(isNumber(100, schema, {})).toBe(100);
    expect(isNumber(50, schema, {})).toBe(50);
    expect(() => isNumber(101, schema, {})).toThrow();
  });

  it('exclusiveMinimum 独占最小值校验', () => {
    const schema = { exclusiveMinimum: 10 };
    expect(isNumber(11, schema, {})).toBe(11);
    expect(() => isNumber(10, schema, {})).toThrow();
  });

  it('exclusiveMaximum 独占最大值校验', () => {
    const schema = { exclusiveMaximum: 100 };
    expect(isNumber(99, schema, {})).toBe(99);
    expect(() => isNumber(100, schema, {})).toThrow();
  });
});

describe('第 2 阶段：isInteger 整数校验与转换', () => {
  it('null/undefined 不处理', () => {
    expect(isInteger(null, {}, {})).toBeNull();
    expect(isInteger(undefined, {}, {})).toBeUndefined();
  });

  it('非整数自动转整数', () => {
    expect(isInteger('123', {}, {})).toBe(123);
    expect(isInteger(123.0, {}, {})).toBe(123);
  });

  it('浮点数字符串抛异常', () => {
    expect(() => isInteger('123.45', {}, {})).toThrow();
  });

  it('浮点数抛异常', () => {
    expect(() => isInteger(123.45, {}, {})).toThrow();
  });

  it('复用 isNumber 的范围校验', () => {
    const schema = { minimum: 10, maximum: 100 };
    expect(isInteger(50, schema, {})).toBe(50);
    expect(() => isInteger(9, schema, {})).toThrow();
    expect(() => isInteger(101, schema, {})).toThrow();
  });
});

describe('第 2 阶段：isBoolean 布尔值校验与转换', () => {
  it('null/undefined 不处理', () => {
    expect(isBoolean(null, {}, {})).toBeNull();
    expect(isBoolean(undefined, {}, {})).toBeUndefined();
  });

  it('布尔值直接返回', () => {
    expect(isBoolean(true, {}, {})).toBe(true);
    expect(isBoolean(false, {}, {})).toBe(false);
  });

  it('字符串自动转布尔值', () => {
    expect(isBoolean('true', {}, {})).toBe(true);
    expect(isBoolean('false', {}, {})).toBe(false);
  });

  it('数字自动转布尔值', () => {
    expect(isBoolean(1, {}, {})).toBe(true);
    expect(isBoolean(0, {}, {})).toBe(false);
  });

  it('其他值抛异常', () => {
    expect(() => isBoolean('other', {}, {})).toThrow();
    expect(() => isBoolean(2, {}, {})).toThrow();
  });
});

describe('第 2 阶段：isDateTime 日期时间校验与转换', () => {
  it('null/undefined 不处理', () => {
    expect(isDateTime(null, {}, {})).toBeNull();
    expect(isDateTime(undefined, {}, {})).toBeUndefined();
  });

  it('Date 对象直接返回', () => {
    const date = new Date();
    expect(isDateTime(date, {}, {})).toBe(date);
  });

  it('字符串自动转 Date 对象', () => {
    const dateStr = '2024-01-01';
    const result = isDateTime(dateStr, {}, {});
    expect(result).toBeInstanceOf(Date);
  });

  it('无效日期抛异常', () => {
    expect(() => isDateTime('not-a-date', {}, {})).toThrow();
  });

  it('type: number 返回时间戳', () => {
    const date = new Date('2024-01-01');
    const result = isDateTime(date, { type: 'number' }, {});
    expect(typeof result).toBe('number');
    expect(result).toBe(date.getTime());
  });

  it('inputType: date 返回日期字符串', () => {
    const date = new Date('2024-01-01T12:34:56');
    const result = isDateTime(date, { type: 'string', inputType: 'date' }, {});
    expect(typeof result).toBe('string');
    expect(result).toBe('2024-01-01');
  });

  it('inputType: time 返回时间字符串', () => {
    const date = new Date('2024-01-01T12:34:56');
    const result = isDateTime(date, { type: 'string', inputType: 'time' }, {});
    expect(typeof result).toBe('string');
    expect(result).toContain(':');
  });

  it('type: string 返回 ISO 字符串', () => {
    const date = new Date('2024-01-01T12:34:56');
    const result = isDateTime(date, { type: 'string' }, {});
    expect(typeof result).toBe('string');
    expect(result).toContain('T');
  });
});

// ==============================================
// 第 3 阶段：基础 validate 集成测试
// ==============================================

describe('第 3 阶段：validate 基础集成', () => {
  it('validate 单字段校验', () => {
    const result = validate('test', { type: 'string' }, {});
    expect(result).toBe('test');
  });

  it('validate 单字段校验转换', () => {
    const result = validate('123', { type: 'number' }, {});
    expect(result).toBe(123);
  });

  it('validate 必填字段校验', () => {
    expect(() => validate(undefined, { type: 'string', required: true }, {})).toThrow();
  });

  it('validate 必填字段校验抛 VError', () => {
    try {
      validate(undefined, { type: 'string', required: true }, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.key).toBe('required');
    }
  });

  it('validate 默认 type 是 object', () => {
    const result = validate({ name: 'test' }, {
      properties: { name: { type: 'string' } }
    }, {});
    expect(result).toEqual({ name: 'test' });
  });
});

// ==============================================
// 第 4 阶段：isObject 对象校验
// ==============================================

describe('第 4 阶段：isObject 对象校验', () => {
  it('null/undefined 不处理', () => {
    expect(isObject(null, {}, {})).toBeNull();
    expect(isObject(undefined, {}, {})).toBeUndefined();
  });

  it('非对象抛异常', () => {
    expect(() => isObject('not-object', {}, {})).toThrow();
    expect(() => isObject(123, {}, {})).toThrow();
    expect(() => isObject([], {}, {})).toThrow();
  });

  it('校验 properties 子字段', () => {
    const schema: FormSchema = {
      properties: {
        name: { type: 'string', required: true },
        age: { type: 'number' },
      }
    };

    const result = isObject({ name: 'test', age: 20 }, schema, {});
    expect(result).toEqual({ name: 'test', age: 20 });
  });

  it('收集多个字段错误', () => {
    const schema: FormSchema = {
      properties: {
        name: { type: 'string', required: true },
        age: { type: 'number', minimum: 18 },
        email: { type: 'string', minLength: 5 },
      }
    };

    try {
      isObject({ name: undefined, age: 10, email: 'a' }, schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.key).toBe('properties');
      expect(Object.keys(verr.errors || {})).toContain('name');
      expect(Object.keys(verr.errors || {})).toContain('age');
      expect(Object.keys(verr.errors || {})).toContain('email');
    }
  });

  it('pickyMode 下遇到第一个错误立即中止', () => {
    const schema: FormSchema = {
      properties: {
        name: { type: 'string', required: true },
        age: { type: 'number', required: true },
      }
    };

    try {
      isObject({ name: undefined, age: undefined }, schema, { pickyMode: true });
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(Object.keys(verr.errors || {}).length).toBe(1);
    }
  });

  it('undefined 字段不收集到结果', () => {
    const schema: FormSchema = {
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      }
    };

    const result = isObject({ name: 'test', age: undefined }, schema, {});
    expect(result).toEqual({ name: 'test' });
    expect('age' in result).toBe(false);
  });

  it('additionalProperties: false 拒绝额外属性', () => {
    const schema: FormSchema = {
      properties: { name: { type: 'string' } },
      additionalProperties: false,
    };

    try {
      isObject({ name: 'test', extra: 'value' }, schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.errors).toHaveProperty('extra');
    }
  });

  it('additionalProperties: schema 校验额外属性', () => {
    const schema: FormSchema = {
      properties: { name: { type: 'string' } },
      additionalProperties: { type: 'number' },
    };

    const result = isObject({ name: 'test', extra: 123 }, schema, {});
    expect(result).toEqual({ name: 'test', extra: 123 });
  });

  it('additionalProperties: schema 校验失败时抛异常', () => {
    const schema: FormSchema = {
      properties: { name: { type: 'string' } },
      additionalProperties: { type: 'number' },
    };

    try {
      isObject({ name: 'test', extra: 'not-number' }, schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.errors).toHaveProperty('extra');
    }
  });
});

// ==============================================
// 第 5 阶段：isArray 数组校验
// ==============================================

describe('第 5 阶段：isArray 数组校验', () => {
  it('null/undefined 不处理', () => {
    expect(isArray(null, {}, {})).toBeNull();
    expect(isArray(undefined, {}, {})).toBeUndefined();
  });

  it('非字符串非数组抛异常', () => {
    expect(() => isArray(123, {}, {})).toThrow();
    expect(() => isArray(true, {}, {})).toThrow();
  });

  it('逗号分隔字符串自动转数组', () => {
    const result = isArray('a,b,c', {}, {});
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('minItems 最小项数校验', () => {
    const schema = { minItems: 2 };
    expect(isArray(['a', 'b'], schema, {})).toEqual(['a', 'b']);
    expect(() => isArray(['a'], schema, {})).toThrow();
  });

  it('maxItems 最大项数校验', () => {
    const schema = { maxItems: 3 };
    expect(isArray(['a', 'b', 'c'], schema, {})).toEqual(['a', 'b', 'c']);
    expect(() => isArray(['a', 'b', 'c', 'd'], schema, {})).toThrow();
  });

  it('uniqueItems 唯一项校验', () => {
    const schema = { uniqueItems: true };
    expect(isArray(['a', 'b', 'c'], schema, {})).toEqual(['a', 'b', 'c']);
    expect(() => isArray(['a', 'b', 'a'], schema, {})).toThrow();
  });

  it('items 子项校验', () => {
    const schema = { items: { type: 'number' } };
    const result = isArray([1, 2, 3], schema, {});
    expect(result).toEqual([1, 2, 3]);
  });

  it('items 子项校验失败时抛异常', () => {
    const schema = { items: { type: 'number' } };
    try {
      isArray([1, 'two', 3], schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.key).toBe('items');
      expect(verr.errors).toHaveProperty('1');
    }
  });

  it('收集多个子项错误', () => {
    const schema = { items: { type: 'number', minimum: 10 } };
    try {
      isArray([5, 8, 15], schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.errors).toHaveProperty('0');
      expect(verr.errors).toHaveProperty('1');
    }
  });

  it('pickyMode 下遇到第一个错误立即中止', () => {
    const schema = { items: { type: 'number', minimum: 10 } };
    try {
      isArray([5, 8, 15], schema, { pickyMode: true });
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(Object.keys(verr.errors || {}).length).toBe(1);
    }
  });

  it('ignores 忽略指定值', () => {
    const schema = {
      items: { type: 'number' },
      ignores: [null, '', undefined],
    };
    const result = isArray([1, null, '', undefined, 2], schema, {});
    expect(result).toEqual([1, 2]);
  });

  it('tuple 数组（items 为数组）校验', () => {
    const schema = {
      items: [
        { type: 'string' },
        { type: 'number' },
        { type: 'boolean' },
      ],
    };
    const result = isArray(['test', 123, true], schema, {});
    expect(result).toEqual(['test', 123, true]);
  });

  it('tuple 数组超出部分 additionalItems: false 抛异常', () => {
    const schema = {
      items: [{ type: 'string' }],
      additionalItems: false,
    };
    try {
      isArray(['test', 'extra'], schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.errors).toHaveProperty('1');
    }
  });

  it('tuple 数组超出部分 additionalItems: schema 校验', () => {
    const schema = {
      items: [{ type: 'string' }],
      additionalItems: { type: 'number' },
    };
    const result = isArray(['test', 123, 456], schema, {});
    expect(result).toEqual(['test', 123, 456]);
  });
});

// ==============================================
// 第 6 阶段：嵌套对象与数组
// ==============================================

describe('第 6 阶段：嵌套对象与数组', () => {
  it('嵌套对象校验', () => {
    const schema: FormSchema = {
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string', required: true },
            address: {
              type: 'object',
              properties: {
                city: { type: 'string', required: true },
              },
            },
          },
        },
      },
    };

    const result = validate({
      user: {
        name: 'test',
        address: { city: 'Shenzhen' }
      }
    }, schema, {});
    expect(result.user.name).toBe('test');
    expect(result.user.address.city).toBe('Shenzhen');
  });

  it('嵌套对象错误也嵌套到 errors', () => {
    const schema: FormSchema = {
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string', required: true },
            address: {
              type: 'object',
              properties: {
                city: { type: 'string', required: true },
              },
            },
          },
        },
      },
    };

    try {
      validate({ user: { name: undefined, address: { city: undefined } } }, schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      const errors = verr.getErrors();
      expect((errors.user as any).name).toBeTruthy();
      expect((errors.user as any).address.city).toBeTruthy();
    }
  });

  it('数组嵌套对象校验', () => {
    const schema: FormSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', required: true },
        },
      },
    };

    const result = validate([{ name: 'test1' }, { name: 'test2' }], schema, {});
    expect(result.length).toBe(2);
  });

  it('数组嵌套对象错误嵌套', () => {
    const schema: FormSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', required: true },
        },
      },
    };

    try {
      validate([{ name: undefined }, { name: 'ok' }], schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      const errors = verr.getErrors();
      expect((errors['0'] as any).name).toBeTruthy();
    }
  });
});

// ==============================================
// 第 7 阶段：requires JSON Schema 风格必填
// ==============================================

describe('第 7 阶段：requires JSON Schema 风格必填', () => {
  it('requires 数组校验', () => {
    const schema: FormSchema = {
      required: ['name', 'email'],
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
      },
    };

    const result = requires({ name: 'test', email: 'test@example.com' }, schema, {});
    expect(result).toEqual({ name: 'test', email: 'test@example.com' });
  });

  it('requires 缺少字段时抛异常', () => {
    const schema: FormSchema = {
      required: ['name', 'email'],
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
      },
    };

    try {
      requires({ name: 'test' }, schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.key).toBe('requires');
    }
  });

  it('requires patchMode 下 undefined 字段跳过', () => {
    const schema: FormSchema = {
      required: ['name', 'email'],
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
      },
    };

    const result = requires({ name: 'test' }, schema, { patchMode: true });
    expect(result).toEqual({ name: 'test' });
  });

  it('requires 集成到 validate', () => {
    const schema: FormSchema = {
      required: ['name', 'email'],
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
      },
    };

    const result = validate({ name: 'test', email: 'test@example.com' }, schema, {});
    expect(result).toEqual({ name: 'test', email: 'test@example.com' });
  });
});

// ==============================================
// 第 8 阶段：patchMode 补丁模式
// ==============================================

describe('第 8 阶段：patchMode 补丁模式', () => {
  it('patchMode undefined 字段触发 VQUIT，不抛异常', () => {
    const schema: FormSchema = {
      properties: {
        name: { type: 'string', required: true },
        age: { type: 'number', required: true },
      },
    };

    const result = validate({ name: 'test' }, schema, { patchMode: true });
    expect(result.name).toBe('test');
    expect('age' in result).toBe(false);
  });

  it('patchMode null 字段仍校验', () => {
    const schema: FormSchema = {
      properties: {
        name: { type: 'string', required: true },
      },
    };

    expect(() => validate({ name: null }, schema, { patchMode: true })).toThrow();
  });

  it('patchMode 对象子字段也是 patchMode', () => {
    const schema: FormSchema = {
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string', required: true },
            email: { type: 'string', required: true },
          },
        },
      },
    };

    const result = validate({ user: { name: 'test' } }, schema, { patchMode: true });
    expect(result.user.name).toBe('test');
    expect('email' in result.user).toBe(false);
  });

  it('patchMode 数组子项也是 patchMode', () => {
    const schema: FormSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', required: true },
          email: { type: 'string', required: true },
        },
      },
    };

    const result = validate([{ name: 'test' }], schema, { patchMode: true });
    expect(result[0].name).toBe('test');
    expect('email' in result[0]).toBe(false);
  });
});

// ==============================================
// 第 9 阶段：自定义 validate 校验
// ==============================================

describe('第 9 阶段：自定义 validate 校验', () => {
  it('单个自定义校验函数', () => {
    const custom = (value: any) => {
      if (value === 'bad') throw new Error('Bad value');
      return String(value) + '_ok';
    };

    const schema = { validate: custom };
    expect(validate('good', schema, {})).toBe('good_ok');
    expect(() => validate('bad', schema, {})).toThrow('Bad value');
  });

  it('多个自定义校验函数按顺序执行', () => {
    const fn1 = (v: any) => String(v) + '_a';
    const fn2 = (v: any) => String(v) + '_b';
    const fn3 = (v: any) => String(v) + '_c';

    const schema = { validate: [fn1, fn2, fn3] };
    expect(validate('x', schema, {})).toBe('x_a_b_c');
  });

  it('多个自定义校验函数，第一个出错即中止', () => {
    const fn1 = () => { throw new Error('First failed'); };
    const fn2 = (v: any) => String(v) + '_b';

    const schema = { validate: [fn1, fn2] };
    expect(() => validate('x', schema, {})).toThrow('First failed');
  });

  it('自定义校验返回 VQUIT 中止后续', () => {
    const fn1 = () => VQUIT;
    const fn2 = (v: any) => String(v) + '_b';

    const schema = { validate: [fn1, fn2] };
    expect(validate('x', schema, {})).toBe('x');
  });

  it('自定义校验返回 VPASS 跳过当前', () => {
    const fn1 = () => VPASS;
    const fn2 = (v: any) => String(v) + '_b';

    const schema = { validate: [fn1, fn2] };
    expect(validate('x', schema, {})).toBe('x_b');
  });

  it('baseValidate 基础校验可用于自定义', () => {
    const custom = (value: any, schema: any, config: any, state: any) => {
      baseValidate(value, schema, config, state);
      return String(value) + '_ok';
    };

    const schema = {
      type: 'string',
      required: true,
      validate: custom,
    };

    expect(validate('test', schema, {})).toBe('test_ok');
  });
});

// ==============================================
// 第 10 阶段：VState 校验状态
// ==============================================

describe('第 10 阶段：VState 校验状态', () => {
  it('object 子字段 validator 能读取 name 和 path', () => {
    const schema: FormSchema = {
      properties: {
        name: {
          validate: (_value, _schema, _modes, state) => `${state?.name}:${state?.getPath()}`
        }
      }
    };

    expect(validate({ name: 'test' }, schema, {})).toEqual({ name: 'name:name' });
  });

  it('嵌套 object 字段能读取多级 path', () => {
    const schema: FormSchema = {
      properties: {
        user: {
          type: 'object',
          properties: {
            name: {
              validate: (_value, _schema, _modes, state) => state?.getPath()
            }
          }
        }
      }
    };

    expect(validate({ user: { name: 'test' } }, schema, {})).toEqual({ user: { name: 'user.name' } });
  });

  it('array 子项 validator 能读取索引 name 和 path', () => {
    const schema: FormSchema = {
      type: 'array',
      items: {
        validate: (_value, _schema, _modes, state) => `${state?.name}:${state?.getPath()}`
      }
    };

    expect(validate(['a', 'b'], schema, {})).toEqual(['0:0', '1:1']);
  });

  it('object 子字段能读取同级 values 和 valids', () => {
    const schema: FormSchema = {
      properties: {
        source: {
          validate: (value) => `${value}_valid`
        },
        target: {
          validate: (_value, _schema, _modes, state) => {
            const values = state?.getValues() as any;
            const valids = state?.getValids() as any;
            return `${values.source}:${valids.source}`;
          }
        }
      }
    };

    expect(validate({ source: 'raw', target: '' }, schema, {})).toEqual({
      source: 'raw_valid',
      target: 'raw:raw_valid'
    });
  });
});

// ==============================================
// 第 11 阶段：VError 错误处理
// ==============================================

describe('第 11 阶段：VError 错误处理', () => {
  it('VError.getError() 获取错误信息', () => {
    const verr = new VError('required');
    expect(verr.getError()).toBeTruthy();
  });

  it('VError.getError() 支持 translator', () => {
    const verr = new VError('required');
    expect(verr.getError(zhTranslator)).toBe('必填项');
  });

  it('VError.getError() 使用 params', () => {
    const verr = new VError('minimum', { value: 10 });
    expect(verr.getError(zhTranslator)).toBe('最小值是 10');
  });

  it('VError.getErrors() 获取字段错误', () => {
    const schema: FormSchema = {
      properties: {
        name: { type: 'string', required: true },
        age: { type: 'number', minimum: 18 },
      }
    };

    try {
      validate({ name: undefined, age: 10 }, schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      const errors = verr.getErrors();
      expect(errors.name).toBeTruthy();
      expect(errors.age).toBeTruthy();
    }
  });

  it('VError.getErrors() 支持 translator', () => {
    const schema: FormSchema = {
      properties: {
        name: { type: 'string', required: true },
        age: { type: 'number', minimum: 18 },
      }
    };

    try {
      validate({ name: undefined, age: 10 }, schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      const errors = verr.getErrors(zhTranslator);
      expect(errors.name).toBe('必填项');
      expect(errors.age).toBe('最小值是 18');
    }
  });

  it('VError.getData() 获取完整错误数据', () => {
    const schema: FormSchema = {
      properties: {
        name: { type: 'string', required: true },
      }
    };

    try {
      validate({ name: undefined }, schema, {});
      expect.unreachable('应该抛出异常');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      const data = verr.getData(zhTranslator);
      expect(data.code).toBe('invalid');
      expect(data.errors).toBeTruthy();
    }
  });
});

// ==============================================
// 第 12 阶段：config.verifies 自定义校验规则
// ==============================================

describe('第 12 阶段：config.verifies 自定义校验规则', () => {
  it('config.verifies 替换默认校验规则', () => {
    const customVerify = (schema: any) => {
      if (schema.append) {
        return (value: any) => `${value}_ok`;
      }
      if (schema.type === 'object') {
        return isObject;
      }
      return undefined;
    };

    const config: FormConfig = {
      verifies: [customVerify]
    };

    const schema = {
      properties: {
        name: { append: true }
      }
    };

    expect(validate({ name: 'test' }, schema, config)).toEqual({ name: 'test_ok' });
  });

  it('config.verifies 与默认 verifies 结合使用', () => {
    // 不用 config.verifies，而是用 schema.validate: [baseValidate, yourValidate] 方式
    const myValidate = (value: any) => {
      if (typeof value === 'string') {
        return `${value}_ok`;
      }
      return value;
    };

    const schema = {
      properties: {
        name: { 
          type: 'string', 
          required: true, 
          validate: [baseValidate, myValidate]
        }
      }
    };

    expect(validate({ name: 'test' }, schema, {})).toEqual({ name: 'test_ok' });
  });
});

// ==============================================
// 第 13 阶段：validateForm 表单 schema 校验
// ==============================================

describe('第 13 阶段：validateForm 表单 schema 校验', () => {
  it('validateForm 校验有效表单 schema', () => {
    const schema = {
      title: '联系表单',
      description: '收集联系方式',
      properties: {
        name: {
          type: 'string',
          inputType: 'text',
          title: '姓名',
          label: '请输入您的姓名',
          description: '请填写常用姓名',
          placeholder: '张三',
          required: true
        },
        email: {
          type: 'string',
          inputType: 'email',
          title: '邮箱',
          format: 'email'
        },
        interests: {
          type: 'array',
          inputType: 'check',
          title: '兴趣',
          items: { type: 'string', enum: ['sport', 'music'] },
          options: { sport: '运动', music: '音乐' },
          minItems: 1
        }
      }
    };

    expect(validateForm(schema)).toEqual(schema);
  });

  it('validateForm 要求根 properties 必填', () => {
    expect(() => validateForm({ title: '空表单' })).toThrow();
  });

  it('validateForm 要求每个字段有 title', () => {
    const schema = {
      title: '错误表单',
      properties: {
        name: { type: 'string', inputType: 'text' }
      }
    };

    expect(() => validateForm(schema)).toThrow();
  });

  it('isInput 为 legend 和 figure 补 type: null', () => {
    expect(isInput({ inputType: 'legend', title: '分组标题' }, {}, {})).toEqual({
      inputType: 'legend',
      title: '分组标题',
      type: 'null'
    });
    expect(isInput({ inputType: 'figure', title: '说明', description: '一段说明' }, {}, {})).toEqual({
      inputType: 'figure',
      title: '说明',
      description: '一段说明',
      type: 'null'
    });
  });

  it('isInput 不覆盖已有 type', () => {
    expect(isInput({ inputType: 'legend', title: '分组标题', type: 'string' }, {}, {})).toEqual({
      inputType: 'legend',
      title: '分组标题',
      type: 'string'
    });
  });
});

// ==============================================
// 第 14 阶段：综合场景测试
// ==============================================

describe('第 14 阶段：综合场景测试', () => {
  it('完整的用户注册表单校验', () => {
    const registerSchema: FormSchema = {
      required: ['username', 'email', 'password'],
      properties: {
        username: {
          type: 'string',
          required: true,
          minLength: 3,
          maxLength: 20,
        },
        email: {
          type: 'string',
          required: true,
          format: 'email',
        },
        password: {
          type: 'string',
          required: true,
          minLength: 8,
        },
        age: {
          type: 'integer',
          minimum: 1,
          maximum: 120,
        },
        gender: {
          type: 'string',
          enum: ['male', 'female', 'other'],
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 10,
        },
        address: {
          type: 'object',
          properties: {
            province: { type: 'string' },
            city: { type: 'string' },
            detail: { type: 'string' },
          },
        },
      },
    };

    const validData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      age: 25,
      gender: 'male',
      tags: ['developer', 'frontend'],
      address: {
        province: 'Guangdong',
        city: 'Shenzhen',
        detail: 'Nanshan District',
      },
    };

    const result = validate(validData, registerSchema, {});
    expect(result.username).toBe('testuser');
    expect(result.email).toBe('test@example.com');
  });

  it('完整的订单表单校验', () => {
    const orderSchema: FormSchema = {
      required: ['orderNo', 'customer', 'items'],
      properties: {
        orderNo: { type: 'string', required: true },
        createdAt: { type: 'string', inputType: 'datetime' },
        customer: {
          type: 'object',
          required: true,
          properties: {
            name: { type: 'string', required: true },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: {
              type: 'object',
              properties: {
                province: { type: 'string', required: true },
                city: { type: 'string', required: true },
                detail: { type: 'string', required: true },
              },
            },
          },
        },
        items: {
          type: 'array',
          required: true,
          minItems: 1,
          maxItems: 50,
          uniqueItems: true,
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string', required: true },
              productName: { type: 'string', required: true },
              price: { type: 'number', minimum: 0, required: true },
              quantity: { type: 'integer', minimum: 1, required: true },
            },
          },
        },
      },
    };

    const orderData = {
      orderNo: 'ORD-001',
      createdAt: new Date(),
      customer: {
        name: '张三',
        email: 'zhangsan@example.com',
        phone: '13800138000',
        address: {
          province: '广东省',
          city: '深圳市',
          detail: '南山区科技园',
        },
      },
      items: [
        {
          productId: 'PROD-001',
          productName: '商品1',
          price: 99.99,
          quantity: 2,
        },
        {
          productId: 'PROD-002',
          productName: '商品2',
          price: 49.99,
          quantity: 1,
        },
      ],
    };

    const result = validate(orderData, orderSchema, {});
    expect(result.orderNo).toBe('ORD-001');
    expect(result.items.length).toBe(2);
  });

  it('条件必填校验（通过 values 访问原始数据）', () => {
    const myVerifies = [
      (schema: any) => {
        if (schema.needPhoneForVip) {
          return (value: any, _sch: any, config: any, state: any) => {
            const values = state?.getValues() as any;
            if (values?.isVip) {
              return required(value, _sch, config, state);
            }
            return optional(value, _sch, config, state);
          };
        }
        return undefined;
      },
      ...verifies,
    ];

    const schema: FormSchema = {
      properties: {
        isVip: { type: 'boolean' },
        phone: { type: 'string', needPhoneForVip: true },
      },
    };

    const config: FormConfig = { verifies: myVerifies };

    // isVip=true 时 phone 必填（完全不包含 phone 字段）
    expect(() => validate({ isVip: true }, schema, config)).toThrow();
    // isVip=false 时 phone 不校验（完全不包含 phone 字段）
    const result1 = validate({ isVip: false }, schema, config);
    expect('phone' in result1).toBe(false);
    // isVip=true 但 phone=undefined 时表示可选
    let state2 = new VState();
    try {
      const result2 = validate({ isVip: true, phone: undefined }, schema, config, state2);
    } catch (e) {
      expect('phone' in state2.getValids()).toBe(false);
    }
  });
});

describe('第 15 阶段：default 默认值', () => {
  it('undefined 值返回 schema.default', () => {
    const schema = { type: 'string', default: 'hello' };
    expect(defaults(undefined, schema, {})).toBe('hello');
  });

  it('有值时返回原始值，不使用默认值', () => {
    const schema = { type: 'string', default: 'hello' };
    expect(defaults('world', schema, {})).toBe('world');
  });

  it('defaultOn=post 默认值是函数时调用并返回结果', () => {
    const schema = { type: 'string', default: () => 'computed', defaultOn: 'post' };
    expect(defaults(undefined, schema, {})).toBe('computed');
  });

  it('默认值是函数且有值时返回原始值', () => {
    const schema = { type: 'string', default: 'hello' };
    expect(defaults('world', schema, {})).toBe('world');
  });

  it('defaultOn=post 在普通模式下返回默认值', () => {
    const schema = { type: 'string', default: 'post-default', defaultOn: 'post' };
    expect(defaults(undefined, schema, {})).toBe('post-default');
  });

  it('defaultOn=post 在 patchMode 下返回 VPASS', () => {
    const schema = { type: 'string', default: 'post-default', defaultOn: 'post' };
    expect(defaults(undefined, schema, { patchMode: true })).toBe(VPASS);
  });

  it('defaultOn=patch 在普通模式下返回 VPASS', () => {
    const schema = { type: 'string', default: 'patch-default', defaultOn: 'patch' };
    expect(defaults(undefined, schema, {})).toBe(VPASS);
  });

  it('defaultOn=patch 在 patchMode 下返回默认值', () => {
    const schema = { type: 'string', default: 'patch-default', defaultOn: 'patch' };
    expect(defaults(undefined, schema, { patchMode: true })).toBe('patch-default');
  });

  it('嵌套对象属性使用默认值', () => {
    const schema: FormSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', default: '匿名用户' },
        age: { type: 'number', default: 18 },
      },
    };
    const result = validate({}, schema, {});
    expect(result.name).toBe('匿名用户');
    expect(result.age).toBe(18);
  });

  it('嵌套对象有值时覆盖默认值', () => {
    const schema: FormSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', default: '匿名用户' },
        age: { type: 'number', default: 18 },
      },
    };
    const result = validate({ name: '张三', age: 25 }, schema, {});
    expect(result.name).toBe('张三');
    expect(result.age).toBe(25);
  });

  it('数组 items 有默认值时验证空数组返回默认值填充', () => {
    const schema: FormSchema = {
      type: 'array',
      items: { type: 'string', default: 'default-item' },
    };
    // 验证空数组成员应用默认值
    const result = validate(['x', 'y'], schema, {});
    expect(result[0]).toBe('x');
    expect(result[1]).toBe('y');
  });

  it('validate 配合 post 模式使用 defaultOn', () => {
    const schema: FormSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', default: '默认名', defaultOn: 'post' },
      },
    };
    // 在普通模式下，defaultOn=post 会应用默认值
    const result = validate({}, schema, {});
    expect(result.name).toBe('默认名');
  });

  it('默认值函数可使用 state.getValids() 获取其他字段校验结果', () => {
    const schema: FormSchema = {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
        tagCount: {
          type: 'number',
          default: (value: any, schema: any, config: any, state: VState) => {
            const valids = state.getValids() as any;
            const tags = valids?.tags;
            return tags?.length ?? 0;
          },
        },
      },
    };
    // tags 字段在校验后会填充到 state.valids 中
    const result = validate({ tags: ['a', 'b', 'c'] }, schema, {});
    expect(result.tagCount).toBe(3);
  });

  it('默认值函数可使用 state.getValues() 获取其他字段原始值', () => {
    const schema: FormSchema = {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        fullName: {
          type: 'string',
          default: (value: any, schema: any, config: any, state: VState) => {
            const values = state.getValues() as any;
            return `${values?.firstName ?? ''} ${values?.lastName ?? ''}`.trim();
          },
        },
      },
    };
    const result = validate({ firstName: '张', lastName: '三' }, schema, {});
    expect(result.fullName).toBe('张 三');
  });

  it('默认值函数在无依赖字段时正常工作', () => {
    const schema: FormSchema = {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          default: (value: any, schema: any, config: any, state: VState) => {
            return '默认标题';
          },
        },
      },
    };
    const result = validate({}, schema, {});
    expect(result.title).toBe('默认标题');
  });
});

describe('第 16 阶段：validateFind MongoDB 查询校验', () => {
  it('validateFind findKey 有定义时使用 findKey 作为查询键', () => {
    const formSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: '姓名', findable: true },
        age: { type: 'number', title: '年龄', findable: true },
        email: { type: 'string', title: '邮箱' }, // 不可查询
      }
    };
    
    const params = {
      myQuery: { name: '张三', age: 25, email: 'test@example.com' },
    };
    
    try {
      validateFind(params, formSchema, { findKey: 'myQuery' });
      expect.unreachable('应该抛出错误');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.key).toBe('invalidFind');
      expect(verr.errors).toBeDefined();
      expect(verr.errors!['email']).toBeInstanceOf(VError);
      expect(verr.errors!['email'].key).toBe('findable');
    }
  });
  
  it('validateFind findKey 未定义时 params.find 被当作普通字段', () => {
    const formSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: '姓名', findable: true },
        age: { type: 'number', title: '年龄', findable: true },
        find: { type: 'object', title: '查询字段' }, // find 本身有定义，但不是 findable
        email: { type: 'string', title: '邮箱', findable: true }, // 可查询
      }
    };
    
    const params = {
      name: '张三',
      age: 25,
      find: { email: 'test@example.com' },
      sort: ['name'],
    };
    
    try {
      validateFind(params, formSchema, {});
      expect.unreachable('应该抛出错误');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.key).toBe('invalidFind');
      expect(verr.errors).toBeDefined();
      expect(verr.errors!['find']).toBeInstanceOf(VError);
      expect(verr.errors!['find'].key).toBe('findable');
    }
  });
  
  it('validateFind findKey 未定义且 params.find 不存在时正常处理', () => {
    const formSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: '姓名', findable: true, sortable: true },
        age: { type: 'number', title: '年龄', findable: true },
      }
    };
    
    const params = {
      name: '张三',
      age: 25,
      sort: ['name'],
    };
    
    // findKey 未定义，findData 是 params 排除 sort 后的剩余部分
    const result = validateFind(params, formSchema, { ignoreErrors: true });
    expect(result.find).toEqual({ name: '张三', age: 25 });
    expect(result.sort).toEqual(['name']);
  });
  
  it('validateFind 在遇到不可排序字段时抛出错误', () => {
    const formSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: '姓名', sortable: true },
        age: { type: 'number', title: '年龄', sortable: true },
        email: { type: 'string', title: '邮箱' }, // 不可排序
      }
    };
    
    const params = {
      sort: ['name', { age: -1 }, 'email'],
    };
    
    try {
      validateFind(params, formSchema, {});
      expect.unreachable('应该抛出错误');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.key).toBe('invalidFind');
      expect(verr.errors).toBeDefined();
      expect(verr.errors!['email']).toBeInstanceOf(VError);
      expect(verr.errors!['email'].key).toBe('sortable');
    }
  });
  
  it('validateFind 使用 ignoreErrors 时不抛出排序错误', () => {
    const formSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: '姓名', sortable: true },
        age: { type: 'number', title: '年龄', sortable: true },
        email: { type: 'string', title: '邮箱' }, // 不可排序
      }
    };
    
    const params = {
      sort: ['name', { age: -1 }, 'email'],
    };
    
    const result = validateFind(params, formSchema, { ignoreErrors: true });
    expect(result.sort).toEqual(['name', { age: -1 }]);
  });
  
  it('validateFind 同时处理 find 和 sort 过滤', () => {
    const formSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: '姓名', findable: true, sortable: true },
        age: { type: 'number', title: '年龄', findable: true },
        email: { type: 'string', title: '邮箱', sortable: true },
        phone: { type: 'string', title: '电话' }, // 都不允许
      }
    };
    
    const params = {
      name: '张三',
      age: 25,
      phone: '1234567890',
      sort: ['name', { email: 1 }, { phone: -1 }],
      limit: 10,
      skip: 20,
    };
    
    try {
      validateFind(params, formSchema, {});
      expect.unreachable('应该抛出错误');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.errors!['phone']).toBeInstanceOf(VError);
    }
  });

  it('validateFind 支持 MongoDB 查询操作符', () => {
    const formSchema = {
      type: 'object',
      properties: {
        age: { type: 'number', title: '年龄', findable: true },
        name: { type: 'string', title: '姓名' }, // 不可查询
      }
    };
    
    const params = {
      age: { $gt: 18, $lt: 30 },
      name: '张三',
    };
    
    try {
      validateFind(params, formSchema, {});
      expect.unreachable('应该抛出错误');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.errors!['name']).toBeInstanceOf(VError);
      expect(verr.errors!['name'].key).toBe('findable');
    }
  });

  it('validateFind 支持 $or 和 $and 操作符', () => {
    const formSchema = {
      type: 'object',
      properties: {
        age: { type: 'number', title: '年龄', findable: true },
        name: { type: 'string', title: '姓名', findable: true },
        phone: { type: 'string', title: '电话' }, // 不可查询
      }
    };
    
    const params = {
      $or: [
        { age: 25, phone: '123' },
        { name: '张三' }
      ]
    };
    
    try {
      validateFind(params, formSchema, {});
      expect.unreachable('应该抛出错误');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.errors!['phone']).toBeInstanceOf(VError);
    }
  });
  
  it('validateFind findKey 未定义但 params 包含 sort 时不会混淆', () => {
    const formSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: '姓名', sortable: true },
        age: { type: 'number', title: '年龄', sortable: true },
      }
    };
    
    const params = {
      sort: ['name', { age: -1 }],
    };
    
    // findKey 未定义，sort 字段不应该被当作 findable 检查
    const result = validateFind(params, formSchema, { ignoreErrors: true });
    expect(result.sort).toEqual(['name', { age: -1 }]);
    expect(result.find || {}).toEqual({});
    expect('sort' in (result.find || {})).toBe(false);
  });
  
  it('validateFind pickyMode 时遇到第一个错误就抛出', () => {
    const formSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: '姓名', findable: true },
        age: { type: 'number', title: '年龄', findable: true },
        phone: { type: 'string', title: '电话' }, // 不可查询
        email: { type: 'string', title: '邮箱' }, // 也不可查询
      }
    };
    
    const params = {
      name: '张三',
      age: 25,
      phone: '123', // 第一个错误
      email: 'test@example.com', // 第二个错误
    };
    
    try {
      validateFind(params, formSchema, { pickyMode: true });
      expect.unreachable('应该抛出错误');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.key).toBe('invalidFind');
      expect(verr.errors).toBeDefined();
      // 只应该有一个错误（phone）
      expect(Object.keys(verr.errors!).length).toBe(1);
      expect(verr.errors!['phone']).toBeInstanceOf(VError);
      expect(verr.errors!['phone'].key).toBe('findable');
      // 不应该有 email 错误
      expect(verr.errors!['email']).toBeUndefined();
    }
  });
  
  it('validateFind pickyMode 时排序字段第一个错误就抛出', () => {
    const formSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: '姓名', sortable: true },
        age: { type: 'number', title: '年龄' }, // 不可排序
        email: { type: 'string', title: '邮箱' }, // 也不可排序
      }
    };
    
    const params = {
      sort: ['name', 'age', 'email'],
    };
    
    try {
      validateFind(params, formSchema, { pickyMode: true });
      expect.unreachable('应该抛出错误');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.key).toBe('invalidFind');
      expect(verr.errors).toBeDefined();
      // 只应该有一个错误（age）
      expect(Object.keys(verr.errors!).length).toBe(1);
      expect(verr.errors!['age']).toBeInstanceOf(VError);
      expect(verr.errors!['age'].key).toBe('sortable');
      // 不应该有 email 错误
      expect(verr.errors!['email']).toBeUndefined();
    }
  });
  
  describe('第 17 阶段：validateSqls SQL 片段生成', () => {
    const formSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: '姓名', findable: true, sortable: true },
        age: { type: 'number', title: '年龄', findable: true, sortable: true },
        phone: { type: 'string', title: '电话' },
        join_table: {
          type: 'object',
          properties: {
            field: { type: 'string', findable: true, sortable: true }
          }
        }
      }
    };
    
    it('validateSqls 生成简单查询', () => {
      const params = { name: '张三', age: 25 };
      const result = validateSqls(params, formSchema, {});
      
      expect(result.where).toBe('name = ? AND age = ?');
      expect(result.whereParams).toEqual(['张三', 25]);
      expect(result.order).toBe('');
      expect(result.limit).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.joins).toEqual([]);
    });
    
    it('validateSqls 生成比较操作符查询', () => {
      const params = { age: { $gt: 18, $lt: 30 } };
      const result = validateSqls(params, formSchema, {});
      
      expect(result.where).toBe('age > ? AND age < ?');
      expect(result.whereParams).toEqual([18, 30]);
    });
    
    it('validateSqls 生成 $in 查询', () => {
      const params = { age: { $in: [18, 20, 25] } };
      const result = validateSqls(params, formSchema, {});
      
      expect(result.where).toBe('age IN (?, ?, ?)');
      expect(result.whereParams).toEqual([18, 20, 25]);
    });
    
    it('validateSqls 生成排序', () => {
      const params = { sort: ['name', { age: -1 }] };
      const result = validateSqls(params, formSchema, {});
      
      expect(result.order).toBe('name ASC, age DESC');
    });
    
    it('validateSqls 处理关联表字段', () => {
      const params = { 'join_table.field': 'test' };
      const result = validateSqls(params, formSchema, {});
      
      expect(result.where).toBe('join_table.field = ?');
      expect(result.whereParams).toEqual(['test']);
      expect(result.joins).toEqual(['join_table']);
    });
    
    it('validateSqls 遇到不可查询字段抛出错误', () => {
      const params = { phone: '123456' };
      
      try {
        validateSqls(params, formSchema, {});
        expect.unreachable('应该抛出错误');
      } catch (err) {
        expect(err).toBeInstanceOf(VError);
        const verr = err as VError;
        expect(verr.key).toBe('invalidSqls');
        expect(verr.errors!['phone']).toBeInstanceOf(VError);
        expect(verr.errors!['phone'].key).toBe('findable');
      }
    });
    
    it('validateSqls 生成 skip 和 limit', () => {
      const params = { skip: 10, limit: 20 };
      const result = validateSqls(params, formSchema, {});
      
      expect(result.skip).toBe(10);
      expect(result.limit).toBe(20);
    });
    
    it('validateSqls 输出 SQL 片段示例', () => {
      // 测试各种 SQL 片段生成
      console.log('\n=== validateSqls SQL 片段生成示例 ===\n');
      
      // 示例 1: 简单查询
      const r1 = validateSqls({ name: '张三', age: 25 }, formSchema, {});
      console.log('【示例 1】简单查询');
      console.log('WHERE:', r1.where);
      console.log('WHERE 参数:', r1.whereParams);
      console.log('');
      
      // 示例 2: 比较操作符
      const r2 = validateSqls({ age: { $gt: 18, $lte: 30 } }, formSchema, {});
      console.log('【示例 2】比较操作符');
      console.log('WHERE:', r2.where);
      console.log('WHERE 参数:', r2.whereParams);
      console.log('');
      
      // 示例 3: $in 查询
      const r3 = validateSqls({ name: { $in: ['张三', '李四'] } }, formSchema, {});
      console.log('【示例 3】$in 查询');
      console.log('WHERE:', r3.where);
      console.log('WHERE 参数:', r3.whereParams);
      console.log('');
      
      // 示例 4: 排序
      const r4 = validateSqls({ sort: ['name', { age: -1 }] }, formSchema, {});
      console.log('【示例 4】排序');
      console.log('ORDER:', r4.order);
      console.log('');
      
      // 示例 5: 关联表字段
      const r5 = validateSqls({ 'join_table.field': 'value' }, formSchema, {});
      console.log('【示例 5】关联表字段');
      console.log('WHERE:', r5.where);
      console.log('JOINS:', r5.joins);
      console.log('');
      
      // 示例 6: 组合查询 + skip/limit + cols + getSql/getParams
      const r6 = validateSqls({ 
        name: { $regex: '张' },
        age: { $gt: 20 },
        sort: ['age'],
        skip: 10,
        limit: 20,
        cols: { name: 1, age: 1 }
      }, formSchema, {});
      console.log('【示例 6】组合查询 + skip/limit + cols + getSql/getParams');
      console.log('WHERE:', r6.where);
      console.log('WHERE 参数:', r6.whereParams);
      console.log('ORDER:', r6.order);
      console.log('SKIP:', r6.skip);
      console.log('LIMIT:', r6.limit);
      console.log('COLS:', r6.cols);
      console.log('SELECT:', r6.select);
      console.log('完整 SQL:', r6.getSql('users'));
      console.log('合并参数:', r6.getParams());
      console.log('');
      
      // 示例 7: $and/$or 逻辑操作符
      const r7 = validateSqls({ 
        $and: [
          { name: '张三' },
          { age: { $gt: 18 } }
        ]
      }, formSchema, {});
      console.log('【示例 7】$and 逻辑操作符');
      console.log('WHERE:', r7.where);
      console.log('WHERE 参数:', r7.whereParams);
      console.log('');
      
      const r8 = validateSqls({ 
        $or: [
          { name: '张三' },
          { age: { $lt: 25 } }
        ]
      }, formSchema, {});
      console.log('【示例 8】$or 逻辑操作符');
      console.log('WHERE:', r8.where);
      console.log('WHERE 参数:', r8.whereParams);
      console.log('');
      
      // 示例 9: cols 排除字段
      const r9 = validateSqls({ cols: { phone: 0 } }, formSchema, {});
      console.log('【示例 9】cols 排除字段');
      console.log('COLS:', r9.cols);
      console.log('');
      
      // 示例 10: getSql 带关联表（默认 JOIN）
      const r10 = validateSqls({ 'join_table.field': 'test', sort: ['join_table.field'] }, formSchema, {});
      console.log('【示例 10】getSql 带关联表（默认 JOIN）');
      console.log('完整 SQL:', r10.getSql('main_table'));
      console.log('合并参数:', r10.getParams());
      console.log('');
      
      // 示例 11: getSql 带自定义 JOIN 配置
      console.log('【示例 11】getSql 带自定义 JOIN 配置');
      console.log('完整 SQL:', r10.getSql('users', {
        join_table: { on: 'users.id = join_table.user_id' }
      }));
      console.log('');
      
      // 示例 12: getSql 带自定义 JOIN 配置（含 to 参数）
      console.log('【示例 12】getSql 带自定义 JOIN 配置（含 to 参数）');
      console.log('完整 SQL:', r10.getSql('users', {
        join_table: { on: 'users.id = profiles.user_id', to: 'profiles' }
      }));
      
      expect(true).toBe(true);
    });
  });
  
  it('validateFind 遇到不支持的操作符抛出 unsupported.symbol 错误', () => {
    const formSchema = {
      type: 'object',
      properties: {
        age: { type: 'number', title: '年龄', findable: true },
      }
    };
    
    const params = {
      age: { $gt: 18, $xxxx: 123 }, // $xxxx 是不支持的操作符
    };
    
    try {
      validateFind(params, formSchema, {});
      expect.unreachable('应该抛出错误');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.key).toBe('invalidFind');
      expect(verr.errors).toBeDefined();
      expect(verr.errors!['$xxxx']).toBeInstanceOf(VError);
      expect(verr.errors!['$xxxx'].key).toBe('unsupportedSymbol');
    }
  });
  
  it('validateFind pickyMode 遇到不支持的操作符立即抛出', () => {
    const formSchema = {
      type: 'object',
      properties: {
        age: { type: 'number', title: '年龄', findable: true },
      }
    };
    
    const params = {
      age: { $xxxx: 123, $yyyy: 456 }, // 多个不支持的操作符
    };
    
    try {
      validateFind(params, formSchema, { pickyMode: true });
      expect.unreachable('应该抛出错误');
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
      const verr = err as VError;
      expect(verr.key).toBe('invalidFind');
      expect(verr.errors).toBeDefined();
      // pickyMode 模式下只收集第一个错误
      expect(Object.keys(verr.errors!).length).toBe(1);
      expect(verr.errors!['$xxxx']).toBeInstanceOf(VError);
      expect(verr.errors!['$xxxx'].key).toBe('unsupportedSymbol');
    }
  });
});
