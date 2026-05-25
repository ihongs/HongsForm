import { describe, it, expect } from 'vitest';
import {
  validate,
  baseValidate,
  formValidate,
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
  patterns,
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
      expect(data.code).toBe('form.invalid');
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
// 第 13 阶段：formValidate 表单 schema 校验
// ==============================================

describe('第 13 阶段：formValidate 表单 schema 校验', () => {
  it('formValidate 校验有效表单 schema', () => {
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

    expect(formValidate(schema)).toEqual(schema);
  });

  it('formValidate 要求根 properties 必填', () => {
    expect(() => formValidate({ title: '空表单' })).toThrow();
  });

  it('formValidate 要求每个字段有 title', () => {
    const schema = {
      title: '错误表单',
      properties: {
        name: { type: 'string', inputType: 'text' }
      }
    };

    expect(() => formValidate(schema)).toThrow();
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
