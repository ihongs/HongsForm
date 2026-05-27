import { describe, it, expect } from 'vitest';
import { validateFields, fieldsToSchema, isInput, VError } from '../src';

// ==============================================
// Form：validateFields 表单字段集合校验
// ==============================================

describe('Form：validateFields 表单字段集合校验', () => {
  it('validateFields 校验简单表单字段数组', () => {
    const fields = [
      { name: 'name', type: 'string', title: '姓名', inputType: 'text' },
      { name: 'age', type: 'number', title: '年龄', inputType: 'number' }
    ];
    const result = validateFields(fields);
    expect(result).toEqual(fields);
  });

  it('validateFields 校验无效字段类型', () => {
    const fields = [
      { name: 'name', type: 'invalid', title: '姓名', inputType: 'text' }
    ];
    try {
      validateFields(fields);
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
    }
  });

  it('validateFields 校验字段缺少 name', () => {
    const fields = [
      { type: 'string', title: '姓名', inputType: 'text' }
    ];
    try {
      validateFields(fields);
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
    }
  });

  it('validateFields 校验字段缺少 inputType', () => {
    const fields = [
      { name: 'name', type: 'string', title: '姓名' }
    ];
    try {
      validateFields(fields);
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
    }
  });

  it('validateFields 校验字段缺少 title', () => {
    const fields = [
      { name: 'name', type: 'string', inputType: 'text' }
    ];
    try {
      validateFields(fields);
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(VError);
    }
  });

  it('isInput 处理 legend 类型', () => {
    const field = { name: 'section', inputType: 'legend', title: '标题' };
    const result = isInput(field, {}, {});
    expect(result.type).toBe('null');
  });

  it('isInput 处理 figure 类型', () => {
    const field = { name: 'image', inputType: 'figure', title: '图片' };
    const result = isInput(field, {}, {});
    expect(result.type).toBe('null');
  });

  it('isInput 处理 tags 类型', () => {
    const field = { name: 'tags', inputType: 'tags', title: '标签' };
    const result = isInput(field, {}, {});
    expect(result.type).toBe('array');
  });

  it('isInput 不处理其他类型', () => {
    const field = { name: 'name', type: 'string', title: '姓名', inputType: 'text' };
    const result = isInput(field, {}, {});
    expect(result).toEqual(field);
  });

  it('isInput 验证 default 与 type 匹配（array）', () => {
    const field = { name: 'tags', type: 'array', default: ['tag1', 'tag2'], title: '标签', inputType: 'tags' };
    const result = isInput(field, {}, {});
    expect(result).toEqual(field);
  });

  it('isInput 验证 default 与 type 不匹配（array）', () => {
    const field = { name: 'tags', type: 'array', default: 'not array', title: '标签', inputType: 'tags' };
    expect(() => isInput(field, {}, {})).toThrow(VError);
  });

  it('isInput 验证 default 与 type 匹配（string）', () => {
    const field = { name: 'name', type: 'string', default: 'test', title: '姓名', inputType: 'text' };
    const result = isInput(field, {}, {});
    expect(result).toEqual(field);
  });

  it('isInput 验证 default 与 type 不匹配（string）', () => {
    const field = { name: 'name', type: 'string', default: ['array'], title: '姓名', inputType: 'text' };
    expect(() => isInput(field, {}, {})).toThrow(VError);
  });
});

// ==============================================
// Form：fieldsToSchema 字段数组转 schema
// ==============================================

describe('Form：fieldsToSchema 字段数组转 schema', () => {
  it('fieldsToSchema 转换简单字段数组', () => {
    const fields = [
      { name: 'name', type: 'string', title: '姓名', inputType: 'text' },
      { name: 'age', type: 'number', title: '年龄', inputType: 'number' }
    ];
    const schema = fieldsToSchema(fields);
    expect(schema.type).toBe('object');
    expect(schema.properties.name).toEqual(fields[0]);
    expect(schema.properties.age).toEqual(fields[1]);
  });

  it('fieldsToSchema 转换空字段数组', () => {
    const fields: any[] = [];
    const schema = fieldsToSchema(fields);
    expect(schema.type).toBe('object');
    expect(schema.properties).toEqual({});
  });
});

// ==============================================
// Form：综合场景测试
// ==============================================

describe('Form：综合场景测试', () => {
  it('完整表单定义校验', () => {
    const fields = [
      {
        name: 'name',
        type: 'string',
        title: '姓名',
        required: true,
        inputType: 'text',
        minLength: 2,
        maxLength: 50
      },
      {
        name: 'email',
        type: 'string',
        title: '邮箱',
        required: true,
        inputType: 'email',
        format: 'email'
      },
      {
        name: 'age',
        type: 'integer',
        title: '年龄',
        required: false,
        inputType: 'number',
        minimum: 18,
        maximum: 100,
        default: 25
      },
      {
        name: 'tags',
        inputType: 'tags',
        title: '标签',
        default: ['标签1', '标签2']
      },
      {
        name: 'section',
        inputType: 'legend',
        title: '其他信息'
      }
    ];

    const result = validateFields(fields);
    expect(result.length).toBe(5);
    expect(result[2].type).toBe('integer');
    expect(result[2].default).toBe(25); // age 的 default 保持
    expect(result[3].type).toBe('array'); // tags 自动设为 array
    expect(result[3].default).toEqual(['标签1', '标签2']); // default 保持
    expect(result[4].type).toBe('null'); // legend 自动设为 null
  });

  it('完整字段验证流程：validateFields → fieldsToSchema', () => {
    const fields = [
      { name: 'name', type: 'string', title: '姓名', required: true, inputType: 'text' },
      { name: 'email', type: 'string', title: '邮箱', required: true, inputType: 'email' }
    ];

    // 1. 校验字段定义
    const validatedFields = validateFields(fields);
    expect(validatedFields).toEqual(fields);

    // 2. 转换为验证 schema
    const schema = fieldsToSchema(validatedFields);
    expect(schema.type).toBe('object');
    expect(schema.properties.name).toEqual(fields[0]);
    expect(schema.properties.email).toEqual(fields[1]);
  });
});
