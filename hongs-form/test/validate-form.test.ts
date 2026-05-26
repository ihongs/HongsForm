import { describe, it, expect } from 'vitest';
import { validateForm, isInput, VError } from '../src';

// ==============================================
// Form：validateForm 表单 schema 校验
// ==============================================

describe('Form：validateForm 表单 schema 校验', () => {
  it('validateForm 校验简单表单', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: '姓名' },
        age: { type: 'number', title: '年龄' },
      },
    };
    const result = validateForm(schema);
    expect(result).toEqual(schema);
  });

  it('validateForm 校验无效字段类型', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'invalid', title: '姓名' },
      },
    };
    try {
      validateForm(schema);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(VError);
    }
  });

  it('validateForm 校验 inputType', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: '姓名', inputType: 'text' },
      },
    };
    const result = validateForm(schema);
    expect(result).toEqual(schema);
  });

  it('isInput 处理 legend 类型', () => {
    const field = { inputType: 'legend', title: '标题' };
    const result = isInput(field, {}, {});
    expect(result.type).toBe('null');
  });

  it('isInput 处理 figure 类型', () => {
    const field = { inputType: 'figure', title: '图片' };
    const result = isInput(field, {}, {});
    expect(result.type).toBe('null');
  });

  it('isInput 不处理其他类型', () => {
    const field = { type: 'string', title: '姓名' };
    const result = isInput(field, {}, {});
    expect(result).toEqual(field);
  });
});

// ==============================================
// Form：综合场景测试
// ==============================================

describe('Form：综合场景测试', () => {
  it('表单结构校验', () => {
    const schema = {
      type: 'object',
      title: '用户表单',
      description: '用户信息录入表单',
      required: ['name', 'email'],
      properties: {
        name: {
          type: 'string',
          title: '姓名',
          required: true,
          inputType: 'text',
        },
        email: {
          type: 'string',
          title: '邮箱',
          required: true,
          inputType: 'email',
        },
        age: {
          type: 'integer',
          title: '年龄',
          minimum: 18,
          maximum: 100,
          inputType: 'number',
        },
      },
    };
    const result = validateForm(schema);
    expect(result.title).toBe('用户表单');
    expect(result.properties.name.required).toBe(true);
  });
});
