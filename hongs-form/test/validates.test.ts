import { describe, it, expect } from 'vitest';
import { validate, isString, isNumber, isInteger, isBoolean, isArray, isObject, optional, required, defaults, VError, VState, VPASS, VQUIT, requires } from '../src';

// ==============================================
// 基础：VPASS/VQUIT 特殊值处理
// ==============================================

describe('基础：VPASS/VQUIT 特殊值处理', () => {
  it('VPASS 表示校验通过', () => {
    expect(VPASS).toBeDefined();
  });

  it('VQUIT 表示跳过处理', () => {
    expect(VQUIT).toBeDefined();
  });

  it('validate 函数', () => {
    const result = validate('test', { type: 'string' }, {});
    expect(result).toBe('test');
  });

  it('validate 函数链式调用', () => {
    const result = validate('test', { type: 'string' }, {});
    expect(result).toBe('test');
  });
});

// ==============================================
// 基础：isString 字符串校验与转换
// ==============================================

describe('基础：isString 字符串校验与转换', () => {
  it('字符串保持不变', () => {
    expect(isString('test', {}, {})).toBe('test');
  });

  it('数字转字符串', () => {
    expect(isString(123, {}, {})).toBe('123');
  });

  it('null 不处理', () => {
    expect(isString(null, {}, {})).toBeNull();
  });

  it('undefined 不处理', () => {
    expect(isString(undefined, {}, {})).toBeUndefined();
  });

  it('format 为 email', () => {
    expect(isString('test@example.com', { format: 'email' }, {})).toBe('test@example.com');
  });

  it('pattern 校验', () => {
    expect(isString('abc123', { pattern: '^[a-z0-9]+$' }, {})).toBe('abc123');
  });

  it('minLength 校验', () => {
    expect(isString('abc', { minLength: 3 }, {})).toBe('abc');
  });

  it('maxLength 校验', () => {
    expect(isString('abc', { maxLength: 5 }, {})).toBe('abc');
  });
});

// ==============================================
// 基础：isNumber/isInteger 数字校验与转换
// ==============================================

describe('基础：isNumber/isInteger 数字校验与转换', () => {
  it('数字保持不变', () => {
    expect(isNumber(123, {}, {})).toBe(123);
  });

  it('字符串转数字', () => {
    expect(isNumber('123', {}, {})).toBe(123);
  });

  it('字符串转小数', () => {
    expect(isNumber('12.34', {}, {})).toBe(12.34);
  });

  it('null 不处理', () => {
    expect(isNumber(null, {}, {})).toBeNull();
  });

  it('undefined 不处理', () => {
    expect(isNumber(undefined, {}, {})).toBeUndefined();
  });

  it('minimum 校验', () => {
    expect(isNumber(10, { minimum: 5 }, {})).toBe(10);
  });

  it('maximum 校验', () => {
    expect(isNumber(10, { maximum: 15 }, {})).toBe(10);
  });

  it('isInteger 整数校验', () => {
    expect(isInteger(10, {}, {})).toBe(10);
  });

  it('isInteger 字符串转整数', () => {
    expect(isInteger('10', {}, {})).toBe(10);
  });

  it('exclusiveMinimum 校验', () => {
    expect(isNumber(10, { exclusiveMinimum: 5 }, {})).toBe(10);
  });

  it('exclusiveMaximum 校验', () => {
    expect(isNumber(10, { exclusiveMaximum: 15 }, {})).toBe(10);
  });
});

// ==============================================
// 基础：isBoolean 布尔校验与转换
// ==============================================

describe('基础：isBoolean 布尔校验与转换', () => {
  it('布尔值保持不变', () => {
    expect(isBoolean(true, {}, {})).toBe(true);
    expect(isBoolean(false, {}, {})).toBe(false);
  });

  it('字符串 true 转布尔', () => {
    expect(isBoolean('true', {}, {})).toBe(true);
  });

  it('字符串 false 转布尔', () => {
    expect(isBoolean('false', {}, {})).toBe(false);
  });

  it('数字转布尔', () => {
    expect(isBoolean(1, {}, {})).toBe(true);
    expect(isBoolean(0, {}, {})).toBe(false);
  });

  it('null 不处理', () => {
    expect(isBoolean(null, {}, {})).toBeNull();
  });

  it('undefined 不处理', () => {
    expect(isBoolean(undefined, {}, {})).toBeUndefined();
  });
});

// ==============================================
// 基础：isArray 数组校验
// ==============================================

describe('基础：isArray 数组校验', () => {
  it('数组保持不变', () => {
    expect(isArray([1, 2, 3], {}, {})).toEqual([1, 2, 3]);
  });

  it('字符串按逗号分割', () => {
    expect(isArray('1,2,3', {}, {})).toEqual(['1', '2', '3']);
  });

  it('null 不处理', () => {
    expect(isArray(null, {}, {})).toBeNull();
  });

  it('undefined 不处理', () => {
    expect(isArray(undefined, {}, {})).toBeUndefined();
  });

  it('对象抛出 array 错误', () => {
    try {
      isArray({}, {}, {});
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(VError);
      expect((e as VError).key).toBe('array');
    }
  });

  it('minItems 校验', () => {
    const schema = { minItems: 2 };
    expect(isArray([1, 2], schema, {})).toEqual([1, 2]);
  });

  it('maxItems 校验', () => {
    const schema = { maxItems: 3 };
    expect(isArray([1, 2], schema, {})).toEqual([1, 2]);
  });

  it('uniqueItems 校验', () => {
    const schema = { uniqueItems: true };
    expect(isArray([1, 2, 3], schema, {})).toEqual([1, 2, 3]);
  });

  it('items 类型校验', () => {
    const schema = { items: { type: 'number' } };
    expect(isArray(['1', '2', '3'], schema, {})).toEqual([1, 2, 3]);
  });

  it('additionalItems 校验', () => {
    const schema = {
      items: [{ type: 'number' }, { type: 'string' }],
      additionalItems: false,
    };
    expect(isArray([1, '2'], schema, {})).toEqual([1, '2']);
    try {
      isArray([1, '2', 3], schema, {});
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(VError);
      expect((e as VError).key).toBe('items');
    }
  });
});

// ==============================================
// 基础：嵌套对象与数组
// ==============================================

describe('基础：嵌套对象与数组', () => {
  it('嵌套对象校验', () => {
    const schema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
        },
      },
    };
    const result = validate({ user: { name: '张三', age: '25' } }, schema, {});
    expect(result.user.name).toBe('张三');
    expect(result.user.age).toBe(25);
  });

  it('嵌套数组校验', () => {
    const schema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'number' },
        },
      },
    };
    const result = validate({ items: ['1', '2', '3'] }, schema, {});
    expect(result.items).toEqual([1, 2, 3]);
  });

  it('复杂嵌套结构', () => {
    const schema = {
      type: 'object',
      properties: {
        groups: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              members: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    age: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    };
    const data = {
      groups: [
        {
          name: '一组',
          members: [
            { name: '张三', age: '25' },
            { name: '李四', age: '30' },
          ],
        },
      ],
    };
    const result = validate(data, schema, {});
    expect(result.groups[0].name).toBe('一组');
    expect(result.groups[0].members[0].age).toBe(25);
  });
});

// ==============================================
// 基础：requires JSON Schema 风格必填
// ==============================================

describe('基础：requires JSON Schema 风格必填', () => {
  it('requires 函数校验', () => {
    const result = requires({ name: '张三', age: 25 }, { required: ['name', 'age'] }, {});
    expect(result).toEqual({ name: '张三', age: 25 });
  });

  it('requires 函数校验失败', () => {
    try {
      requires({ name: '张三' }, { required: ['name', 'age'] }, {});
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(VError);
      expect((e as VError).key).toBe('requires');
    }
  });

  it('validate 中使用 requires', () => {
    const schema = {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string' },
        password: { type: 'string' },
      },
    };
    expect(validate({ username: 'user', password: '123' }, schema, {})).toEqual({ username: 'user', password: '123' });
  });

  it('多个依赖字段', () => {
    const schema = {
      type: 'object',
      required: ['a', 'b', 'c'],
      properties: {
        a: { type: 'string' },
        b: { type: 'string' },
        c: { type: 'string' },
      },
    };
    expect(validate({ a: 'test', b: 'test', c: 'test' }, schema, {})).toEqual({ a: 'test', b: 'test', c: 'test' });
  });
});

// ==============================================
// 基础：patchMode 补充模式
// ==============================================

describe('基础：patchMode 补充模式', () => {
  it('patchMode 跳过 undefined', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', required: true },
        age: { type: 'number', required: true },
      },
    };
    const result = validate({ name: '张三' }, schema, { patchMode: true });
    expect(result.name).toBe('张三');
    expect(result.age).toBeUndefined();
  });

  it('patchMode 保留 null 但校验必填', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', required: true },
      },
    };
    try {
      validate({ name: null }, schema, { patchMode: true });
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(VError);
    }
  });
});

// ==============================================
// 基础：自定义 validate 校验
// ==============================================

describe('基础：自定义 validate 校验', () => {
  it('单个自定义校验函数', () => {
    const schema = {
      type: 'string',
      validate: (value: string) => {
        if (value.length < 5) throw new VError('short');
        return value;
      },
    };
    expect(validate('abcde', schema, {})).toBe('abcde');
  });

  it('多个自定义校验函数', () => {
    const schema = {
      type: 'string',
      validate: [
        (value: string) => value.trim(),
        (value: string) => {
          if (value.length < 5) throw new VError('short');
          return value;
        },
      ],
    };
    expect(validate(' abcde ', schema, {})).toBe('abcde');
  });

  it('自定义校验返回 VPASS', () => {
    const schema = {
      type: 'string',
      validate: (value: string) => {
        if (value === 'skip') return VPASS;
        return value;
      },
    };
    const result = validate('skip', schema, {});
    expect(result).toBe('skip');
  });
});

// ==============================================
// 基础：VState 校验状态
// ==============================================

describe('基础：VState 校验状态', () => {
  it('VState 构造函数', () => {
    const state = new VState('field', undefined);
    expect(state.name).toBe('field');
    expect(state.parent).toBeUndefined();
  });

  it('VState.getPath', () => {
    const parent = new VState('parent');
    const child = new VState('child', parent);
    expect(child.getPath()).toBe('parent.child');
  });

  it('state.values 存储原始数据', () => {
    const state: VState = {};
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };
    validate({ name: '张三' }, schema, {}, state);
    expect(state.values).toBeDefined();
  });

  it('state.valids 存储校验后数据', () => {
    const state: VState = {};
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };
    validate({ name: '张三' }, schema, {}, state);
    expect(state.valids).toBeDefined();
  });

  it('VError.errors 收集子错误', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', required: true },
        age: { type: 'number', required: true },
      },
    };
    try {
      validate({}, schema, {});
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(VError);
      expect((e as VError).errors).toBeDefined();
      expect(Object.keys((e as VError).errors || {})).toHaveLength(2);
    }
  });
});

// ==============================================
// 基础：VError 错误处理
// ==============================================

describe('基础：VError 错误处理', () => {
  it('VError 基本使用', () => {
    const error = new VError('required');
    expect(error.key).toBe('required');
  });

  it('VError 包含 params', () => {
    const error = new VError('test', { value: 'invalid' });
    expect(error.params).toEqual({ value: 'invalid' });
  });

  it('VError 包含 errors 子错误', () => {
    const errors = { field1: new VError('required'), field2: new VError('number') };
    const error = new VError('invalid', undefined, errors);
    expect(error.errors).toEqual(errors);
  });

  it('VError 消息', () => {
    const error = new VError('required');
    expect(error.message).toBe('required');
  });

  it('VError 嵌套错误通过 params', () => {
    const inner = new VError('inner');
    const outer = new VError('outer', { error: inner });
    expect(outer.params?.error).toBe(inner);
  });
});

// ==============================================
// 基础：config.verifies 自定义校验规则
// ==============================================

describe('基础：config.verifies 自定义校验规则', () => {
  it('自定义校验规则', () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
    };
    const verifies = [
      (sch: any) => {
        if (sch.format === 'email') {
          return (value: any) => {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              throw new VError('email');
            }
            return value;
          };
        }
      },
    ];
    expect(validate({ email: 'test@example.com' }, schema, { verifies })).toEqual({ email: 'test@example.com' });
  });

  it('自定义校验规则覆盖默认规则', () => {
    const schema = {
      type: 'string',
      format: 'custom',
    };
    const verifies = [
      (sch: any) => {
        if (sch.type === 'string') {
          return (value: any) => String(value);
        }
      },
      (sch: any) => {
        if (sch.format === 'custom') {
          return (value: any) => {
            if (value.length < 3) throw new VError('custom');
            return value;
          };
        }
      },
    ];
    expect(validate('abc', schema, { verifies })).toBe('abc');
  });
});

// ==============================================
// 基础：default 默认值
// ==============================================

describe('基础：default 默认值', () => {
  it('简单默认值', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', default: '匿名' },
      },
    };
    const result = validate({}, schema, {});
    expect(result.name).toBe('匿名');
  });

  it('default 为函数', () => {
    const schema = {
      type: 'object',
      properties: {
        timestamp: { type: 'number', default: () => Date.now() },
      },
    };
    const result = validate({}, schema, {});
    expect(typeof result.timestamp).toBe('number');
  });

  it('defaultOn post 模式', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', default: '匿名', defaultOn: 'post' },
      },
    };
    const result = validate({}, schema, {});
    expect(result.name).toBe('匿名');
  });

  it('patchMode 下应用默认值（默认行为）', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', default: '匿名' },
      },
    };
    const result = validate({}, schema, { patchMode: true });
    expect(result).toEqual({ name: '匿名' });
  });

  it('defaultOn post 时 patchMode 不应用默认值', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', default: '匿名', defaultOn: 'post' },
      },
    };
    const result = validate({}, schema, { patchMode: true });
    expect(result).toEqual({});
  });
});
