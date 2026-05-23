import { describe, it, expect } from 'vitest';
import {
  validate,
  optional,
  required,
  isString,
  isNumber,
  isInteger,
  isBoolean,
  isArray,
  isObject,
  isDateTime,
  VPASS,
  VQUIT,
  coreValidate,
  moreValidate,
  coreValidates,
  moreValidates,
  type FormSchema,
  type VModes,
  type VError,
} from '../src';
import { formStruct, isInput } from '../src/validates.js';

describe('VPASS/VQUIT', () => {
  it('PASS/QUIT 不能被 JSON 序列化或转成字符串', () => {
    expect(() => JSON.stringify(VPASS)).toThrow('VPASS cannot be serialized');
    expect(() => JSON.stringify({ value: VQUIT })).toThrow('VQUIT cannot be serialized');
    expect(() => String(VPASS)).toThrow('VPASS cannot be converted');
    expect(() => `${VQUIT}`).toThrow('VQUIT cannot be converted');
  });
});

describe('optional', () => {
  it('undefined 返回 VQUIT，跳过后续校验', () => {
    expect(optional(undefined, {}, {})).toBe(VQUIT);
  });

  it('null 和空字符串不退出，交给后续类型校验处理', () => {
    expect(optional(null, {}, {})).toBeNull();
    expect(optional('', {}, {})).toBe('');
  });
});

describe('required', () => {
  it('undefined 只抛消息', () => {
    const schema = { required: true };
    expect(() => required(undefined, schema, {})).toThrow('Required');
  });

  it('null 抛 Required 异常', () => {
    const schema = { required: true };
    expect(() => required(null, schema, {})).toThrow('Required');
  });
});

describe('validate - 单项校验', () => {
  it('单项校验遇错只抛 message，不包装 VError', () => {
    const schema = { type: 'string', required: true };
    // 单项校验直接抛 Error，只有 message
    expect(() => validate(undefined, schema, { path: 'name' })).toThrow('Required');
  });

  it('按 moreValidates 顺序执行，第一个失败即中止', () => {
    const schema = { type: 'string', required: true, minLength: 10 };
    // required 先失败，抛消息
    expect(() => validate(undefined, schema, { path: 'name' })).toThrow('Required');
  });

  it('选填字符串为空字符串时跳过格式校验', () => {
    const schema = { type: 'string', pattern: '^.+@.+\\..+$' };
    expect(validate('', schema, {})).toBe('');
  });

  it('选填对象字段为 undefined 时不收集到结果', () => {
    const schema: FormSchema = {
      properties: {
        email: { type: 'string', pattern: '^.+@.+\\..+$' },
      },
    };
    expect(validate({ email: undefined }, schema, {})).toEqual({});
  });

  it('缺少 pattern 时使用 format 对应的内置 pattern', () => {
    expect(validate('test@example.com', { type: 'string', format: 'email' }, {})).toBe('test@example.com');
    expect(() => validate('bad-email', { type: 'string', format: 'email' }, {})).toThrow('Invalid format');
  });

  it('pattern 优先于 format', () => {
    const schema = { type: 'string', format: 'email', pattern: '^abc$' };
    expect(validate('abc', schema, {})).toBe('abc');
    expect(() => validate('test@example.com', schema, {})).toThrow('Invalid format');
  });

  it('有 format 但没有对应内置 pattern 时抛错', () => {
    expect(() => validate('abc', { type: 'string', format: 'unknown-format' }, {})).toThrow('Unknown format: unknown-format');
  });

  it('支持 uuid format', () => {
    expect(validate('550e8400-e29b-41d4-a716-446655440000', { type: 'string', format: 'uuid' }, {})).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(() => validate('not-uuid', { type: 'string', format: 'uuid' }, {})).toThrow('Invalid format');
  });
});

describe('isObject - 收集多个字段错误', () => {
  it('非对象时抛 i18n 对象错误', () => {
    expect(() => validate('abc', { type: 'object' }, {})).toThrow('Must be object');
  });

  it('required 数组收集字段级错误', () => {
    const schema: FormSchema = {
      type: 'object',
      required: ['name', 'rating'],
      properties: {
        name: { type: 'string' },
        rating: { type: 'integer' },
      },
    };

    try {
      validate({ name: 'test' }, schema, {});
    } catch (err) {
      const verr = err as VError;
      expect(verr.message).toBe('Some properties are invalid');
      expect(verr.toMap()).toEqual({ rating: 'Required' });
    }
  });

  it('收集多个字段的错误，放入 errors 对象（嵌套结构）', () => {
    const schema: FormSchema = {
      properties: {
        name: { type: 'string', required: true },
        age: { type: 'number', minimum: 18 },
        email: { type: 'string', minLength: 5 },
      },
    };
    const data = { name: undefined, age: 10, email: 'a' };
    try {
      validate(data, schema, {});
    } catch (err) {
      const verr = err as VError;
      expect(verr.message).toBe('Some properties are invalid');
      expect(verr.errors?.name).toBe('Required');
      expect(verr.errors?.age).toBeTruthy();
      expect(verr.errors?.email).toBeTruthy();
      // toMap 层级结构
      const map = verr.toMap();
      expect(map.name).toBe('Required');
      expect(map.age).toBeTruthy();
    }
  });

  it('嵌套对象错误也嵌套到 errors', () => {
    const schema: FormSchema = {
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string', required: true },
            address: {
              properties: {
                city: { type: 'string', required: true },
              },
            },
          },
        },
      },
    };
    const data = { user: { name: undefined, address: { city: undefined } } };
    try {
      validate(data, schema, {});
    } catch (err) {
      const verr = err as VError;
      const map = verr.toMap();
      expect((map.user as any).name).toBe('Required');
      expect((map.user as any).address.city).toBe('Required');
    }
  });

  it('patchMode 下 undefined 触发 VQUIT，不抛异常，字段级中止后续校验', () => {
    const schema: FormSchema = {
      properties: {
        name: { type: 'string', required: true, minLength: 10 }, // minLength 不会执行
        age: { type: 'number', required: true },
      },
    };
    const data = { name: undefined, age: undefined };
    // patchMode + undefined + required = VQUIT
    const result = validate(data, schema, { patchMode: true });
    expect(result.name).toBeUndefined();
    expect(result.age).toBeUndefined();
  });
});

describe('isArray - 收集多个子项错误', () => {
  it('非数组且非字符串时抛 i18n 数组错误', () => {
    expect(() => validate(123, { type: 'array' }, {})).toThrow('Must be array');
  });

  it('收集多个子项错误，数字键作为 errors 的 key', () => {
    const schema: FormSchema = {
      type: 'array',
      items: { type: 'number', minimum: 10 },
    };
    const data = [5, 8, 15];
    try {
      validate(data, schema, {});
    } catch (err) {
      const verr = err as VError;
      expect(verr.message).toBe('Some items are invalid');
      expect(verr.errors?.['0']).toBeTruthy();
      expect(verr.errors?.['1']).toBeTruthy();
      expect(verr.errors?.['2']).toBeUndefined(); // 15 有效
    }
  });

  it('数组嵌套对象，错误嵌套到 errors', () => {
    const schema: FormSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', required: true },
        },
      },
    };
    const data = [{ name: undefined }, { name: 'ok' }, { name: undefined }];
    try {
      validate(data, schema, {});
    } catch (err) {
      const verr = err as VError;
      const map = verr.toMap();
      expect((map['0'] as any).name).toBe('Required');
      expect((map['2'] as any).name).toBe('Required');
    }
  });

  it('patchMode 下遇到第一个错误立即中止，只收集一个', () => {
    const schema: FormSchema = {
      type: 'array',
      items: { type: 'number', minimum: 10 },
    };
    const data = [5, 8, 15]; // 5 错，8 不会校验
    try {
      validate(data, schema, { patchMode: true });
    } catch (err) {
      const verr = err as VError;
      expect(Object.keys(verr.errors || {})).toEqual(['0']);
    }
  });
});

describe('toMap() 转换', () => {
  it('错误链转成层级结构映射', () => {
    const schema: FormSchema = {
      properties: {
        name: { type: 'string', required: true },
        age: { type: 'number', minimum: 18 },
      },
    };
    const data = { name: undefined, age: 10 };
    try {
      validate(data, schema, {});
    } catch (err) {
      const verr = err as VError;
      const map = verr.toMap();
      expect(map.name).toBe('Required');
      expect(map.age).toBe('Minimum is 18');
    }
  });
});

describe('类型转换', () => {
  it('字符串转数字', () => {
    const result = validate('123', { type: 'number' }, {});
    expect(result).toBe(123);
  });

  it('数字转字符串', () => {
    const result = validate(123, { type: 'string' }, {});
    expect(result).toBe('123');
  });

  it('字符串转布尔值', () => {
    expect(validate('true', { type: 'boolean' }, {})).toBe(true);
    expect(validate('false', { type: 'boolean' }, {})).toBe(false);
  });
});

describe('patchMode', () => {
  it('undefined 字段：返回 VQUIT，跳过后续校验', () => {
    const schema: FormSchema = {
      properties: {
        name: { type: 'string', required: true },
        age: { type: 'number', required: true }, // age 为 undefined，触发 VQUIT
      },
    };
    // 只传 name，age 是 undefined，patchMode 下触发 VQUIT
    const result = validate({ name: 'test' }, schema, { patchMode: true });
    expect(result.name).toBe('test');
    expect(result.age).toBeUndefined(); // 没有被校验
  });

  it('null：不触发 VQUIT，按 required 规则抛异常', () => {
    const schema: FormSchema = {
      properties: {
        name: { type: 'string', required: true },
      },
    };
    // null 不是 undefined，所以会抛 Required 异常
    expect(() => validate({ name: null }, schema, { patchMode: true })).toThrow();
  });
});

describe('VQUIT - 中止字段校验', () => {
  it('patchMode + undefined + required: 返回 VQUIT，中止后续校验', () => {
    const schema: FormSchema = {
      type: 'string',
      required: true,
      minLength: 10, // 这个校验不会执行
    };
    // undefined 在 patchMode 下触发 VQUIT，不会抛异常，也不执行 minLength
    const result = validate(undefined, schema, { patchMode: true });
    expect(result).toBeUndefined();
  });

  it('非 patchMode: undefined 抛 Required 异常', () => {
    const schema = { type: 'string', required: true };
    expect(() => validate(undefined, schema, {})).toThrow('Required');
  });

  it('非 patchMode: null 抛 Required 异常', () => {
    const schema = { type: 'string', required: true };
    expect(() => validate(null, schema, {})).toThrow('Required');
  });

  it('非 patchMode: 空串 抛 Required 异常', () => {
    const schema = { type: 'string', required: true };
    expect(() => validate('', schema, {})).toThrow('Required');
  });

  it('patchMode: null 不触发 VQUIT，继续后续校验（抛异常）', () => {
    // null 不是 undefined，不触发 VQUIT，继续 required 校验，抛异常
    const schema = { type: 'string', required: true };
    expect(() => validate(null, schema, { patchMode: true })).toThrow('Required');
  });

  it('自定义校验返回 VQUIT 中止后续校验', () => {
    const fn1 = () => VQUIT;
    const fn2 = (v: unknown) => String(v) + '_processed'; // 不会被执行
    const schema = { validate: [fn1, fn2] };
    const result = validate('test', schema, {});
    expect(result).toBe('test'); // fn1 返回 VQUIT，返回原值，fn2 不执行
  });
});

describe('自定义 validate', () => {
  it('单个自定义校验函数', () => {
    const custom = (value: unknown) => {
      if (value === 'bad') throw new Error('Bad value');
      return String(value) + '_ok';
    };
    const schema = { validate: custom };
    expect(validate('good', schema, {})).toBe('good_ok');
    // 非 isObject/isArray 子项的校验直接抛 Error，不包装 VError
    expect(() => validate('bad', schema, { path: 'field' })).toThrow('Bad value');
  });

  it('多个自定义校验函数按顺序执行', () => {
    const fn1 = (v: unknown) => String(v) + '_a';
    const fn2 = (v: unknown) => String(v) + '_b';
    const fn3 = (v: unknown) => String(v) + '_c';
    const schema = { validate: [fn1, fn2, fn3] };
    expect(validate('x', schema, {})).toBe('x_a_b_c');
  });

  it('多个自定义校验函数，第一个出错即中止', () => {
    const fn1 = () => { throw new Error('First failed'); };
    const fn2 = (v: unknown) => String(v) + '_b'; // 不会执行
    const schema = { validate: [fn1, fn2] };
    expect(() => validate('x', schema, {})).toThrow('First failed');
  });

  it('自定义校验中返回 VQUIT 中止后续', () => {
    const fn1 = () => VQUIT;
    const fn2 = (v: unknown) => String(v) + '_b'; // 不会执行
    const schema = { validate: [fn1, fn2] };
    expect(validate('x', schema, {})).toBe('x');
  });
});

describe('VModes.validates 传递', () => {
  it('object 子字段沿用 modes.validates 指定的校验集合', () => {
    const appendValidate = (value: unknown) => `${value}_ok`;
    const modes: VModes = {
      validates: [
        (schema) => schema.append === true ? appendValidate : undefined,
        (schema) => schema.properties ? isObject : undefined
      ]
    };
    const schema: FormSchema = {
      type: 'object',
      properties: {
        name: { append: true }
      }
    };

    expect(validate({ name: 'test' }, schema, modes)).toEqual({ name: 'test_ok' });
  });

  it('array 子项沿用 modes.validates 指定的校验集合', () => {
    const appendValidate = (value: unknown) => `${value}_ok`;
    const modes: VModes = {
      validates: [
        (schema) => schema.append === true ? appendValidate : undefined,
        (schema) => schema.type === 'array' ? isArray : undefined
      ]
    };
    const schema: FormSchema = {
      type: 'array',
      items: { append: true }
    };

    expect(validate(['a', 'b'], schema, modes)).toEqual(['a_ok', 'b_ok']);
  });
});

describe('VState', () => {
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

describe('注册 moreValidates - 匹配器函数', () => {
  it('添加自定义匹配器到 moreValidates', () => {
    // 备份原有的 moreValidates
    const originalLen = moreValidates.length;

    // 添加自定义匹配器：当 schema.xxx 存在时返回校验函数
    const myMatcher = (schema: any) => {
      if (schema.xxx) {
        return (value: unknown) => {
          if (value !== 'xxx') throw new Error('Need xxx');
          return value;
        };
      }
      return undefined;
    };
    moreValidates.push(myMatcher);

    try {
      // 测试新匹配器生效，type: null 跳过默认 object 校验
      const schema = { xxx: true, type: null as any };
      expect(() => validate('yyy', schema, {})).toThrow('Need xxx');
      expect(validate('xxx', schema, {})).toBe('xxx');
    } finally {
      // 恢复
      moreValidates.length = originalLen;
    }
  });

  it('多个匹配器按顺序匹配', () => {
    const originalLen = moreValidates.length;

    const matcher1 = (schema: any) => {
      if (schema.check1) {
        return (v: unknown) => String(v) + '_1';
      }
      return undefined;
    };
    const matcher2 = (schema: any) => {
      if (schema.check2) {
        return (v: unknown) => String(v) + '_2';
      }
      return undefined;
    };
    moreValidates.push(matcher1, matcher2);

    try {
      const schema = { check1: true, check2: true, type: null as any };
      const result = validate('x', schema, {});
      // 两个匹配器都命中，校验函数按匹配顺序执行
      expect(result).toBe('x_1_2');
    } finally {
      moreValidates.length = originalLen;
    }
  });

  it('核心匹配器可用于条件必填校验，通过 values 访问原始数据', () => {
    const originalValidates = [...coreValidates];

    // 当 values 中有 isVip=true 时，phone 字段必填
    const vipPhoneMatcher = (schema: any) => {
      if (schema.needPhoneForVip) {
        return (value: unknown, _sch: any, modes: VModes, state) => {
          const values = state?.getValues() as any;
          if (values?.isVip) {
            return required(value, _sch, modes, state);
          }
          return value;
        };
      }
      return undefined;
    };
    coreValidates.unshift(vipPhoneMatcher);

    try {
      const schema: FormSchema = {
        properties: {
          isVip: { type: 'boolean' },
          phone: { type: 'string', needPhoneForVip: true },
        },
      };

      // isVip=true 时 phone 必填
      expect(() => validate({ isVip: true, phone: undefined }, schema, {})).toThrow();
      // isVip=false 时 phone 不校验
      const result = validate({ isVip: false, phone: undefined }, schema, {});
      expect(result.phone).toBeUndefined();
    } finally {
      coreValidates.splice(0, coreValidates.length, ...originalValidates);
    }
  });
});

describe('formStruct / isInput', () => {
  it('校验设计器生成的有效表单 schema', () => {
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

    expect(validate(schema, formStruct, {})).toEqual(schema);
  });

  it('要求根 properties 必填', () => {
    expect(() => validate({ title: '空表单' }, formStruct, {})).toThrow();
  });

  it('要求每个字段有 title', () => {
    const schema = {
      title: '错误表单',
      properties: {
        name: { type: 'string', inputType: 'text' }
      }
    };

    try {
      validate(schema, formStruct, {});
    } catch (err) {
      const verr = err as VError;
      const map = verr.toMap();
      expect((map.properties as any).name.title).toBe('Required');
    }
  });

  it('拒绝非法 inputType', () => {
    const schema = {
      title: '错误表单',
      properties: {
        name: { type: 'string', inputType: 'bad-input', title: '姓名' }
      }
    };

    expect(() => validate(schema, formStruct, {})).toThrow();
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

describe('undefined 值过滤', () => {
  it('isObject: undefined 的属性不收集到结果', () => {
    const schema: FormSchema = {
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
    };
    const data = { name: 'test', age: undefined };
    const result = validate(data, schema, { patchMode: true });
    expect(result.age).toBeUndefined(); // 键被删除了
    expect(Object.keys(result)).toEqual(['name']); // 只有 name
  });

  it('isArray: undefined 的元素不收集到结果', () => {
    const schema: FormSchema = {
      type: 'array',
      items: { type: 'string' },
    };
    const data = ['a', undefined, 'b'];
    const result = validate(data, schema, { patchMode: true });
    expect(result).toEqual(['a', 'b']); // undefined 被过滤
  });
});
