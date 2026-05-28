import { describe, it, expect } from 'vitest';
import { validateFind, VError, VState } from '../src';

// ==============================================
// Mongo：validateFind MongoDB 查询校验
// ==============================================

describe('Mongo：validateFind MongoDB 查询校验', () => {
  const formSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', title: '姓名', findable: true, sortable: true },
      age: { type: 'number', title: '年龄', findable: true, sortable: true },
      phone: { type: 'string', title: '电话', findable: true, sortable: true },
      join_table: {
        type: 'object',
        findable: true,
        sortable: true,
        properties: {
          field: { type: 'string', findable: true, sortable: true }
        }
      }
    }
  };

  it('validateFind 简单查询', () => {
    const params = { name: '张三', age: 25 };
    const result = validateFind(params, formSchema, {});
    
    expect(result.find).toEqual({ name: '张三', age: 25 });
    expect(result.sort).toEqual([]);
  });

  it('validateFind 包含可查询字段', () => {
    const params = { name: '张三', phone: '123456' };
    const result = validateFind(params, formSchema, {});
    
    expect(result.find).toEqual({ name: '张三', phone: '123456' });
  });

  it('validateFind 比较操作符', () => {
    const params = { age: { $gt: 18, $lt: 30 } };
    const result = validateFind(params, formSchema, {});
    
    expect(result.find).toEqual({ age: { $gt: 18, $lt: 30 } });
  });

  it('validateFind $in 查询', () => {
    const params = { name: { $in: ['张三', '李四'] } };
    const result = validateFind(params, formSchema, {});
    
    expect(result.find).toEqual({ name: { $in: ['张三', '李四'] } });
  });

  it('validateFind 排序 - MongoDB 对象格式', () => {
    const params = { sort: { name: 1, age: -1 } };
    const result = validateFind(params, formSchema, {});
    
    expect(result.sort).toEqual({ name: 1, age: -1 });
  });

  it('validateFind 排序 - 数组字符串格式', () => {
    const params = { sort: ['phone', 'name'] };
    const result = validateFind(params, formSchema, {});
    
    expect(result.sort).toEqual({ phone: 1, name: 1 });
  });

  it('validateFind 排序 - 感叹号后缀格式', () => {
    const params = { sort: ['name', 'age!'] };
    const result = validateFind(params, formSchema, {});
    
    expect(result.sort).toEqual({ name: 1, age: -1 });
  });

  it('validateFind 排序 - 减号前缀格式（兼容 Django）', () => {
    const params = { sort: ['name', '-age'] };
    const result = validateFind(params, formSchema, {});
    
    expect(result.sort).toEqual({ name: 1, age: -1 });
  });

  it('validateFind 排序 - 感叹号和减号混用', () => {
    const params = { sort: ['name!', '-age'] };
    const result = validateFind(params, formSchema, {});
    
    expect(result.sort).toEqual({ name: -1, age: -1 });
  });

  it('validateFind skip 和 limit', () => {
    const params = { skip: 10, limit: 20 };
    const result = validateFind(params, formSchema, {});
    
    expect(result.skip).toBe(10);
    expect(result.limit).toBe(20);
  });

  it('validateFind 默认值', () => {
    const params = {};
    const result = validateFind(params, formSchema, {});
    
    expect(result.skip).toBe(0);
    expect(result.limit).toBe(1);
  });

  it('validateFind 关联表字段', () => {
    const params = { 'join_table.field': 'value' };
    const result = validateFind(params, formSchema, {});
    
    expect(result.find).toEqual({ 'join_table.field': 'value' });
  });

  it('validateFind 逻辑操作符 $and', () => {
    const params = { $and: [{ name: '张三' }, { age: { $gt: 18 } }] };
    const result = validateFind(params, formSchema, {});
    
    expect(result.find).toEqual({ $and: [{ name: '张三' }, { age: { $gt: 18 } }] });
  });

  it('validateFind 逻辑操作符 $or', () => {
    const params = { $or: [{ name: '张三' }, { age: { $lt: 25 } }] };
    const result = validateFind(params, formSchema, {});
    
    expect(result.find).toEqual({ $or: [{ name: '张三' }, { age: { $lt: 25 } }] });
  });

  it('validateFind $nin 查询', () => {
    const params = { name: { $nin: ['张三', '李四'] } };
    const result = validateFind(params, formSchema, {});
    
    expect(result.find).toEqual({ name: { $nin: ['张三', '李四'] } });
  });

  it('validateFind $regex 查询', () => {
    const params = { name: { $regex: '张' } };
    const result = validateFind(params, formSchema, {});
    
    expect(result.find).toEqual({ name: { $regex: '张' } });
  });

  it('validateFind $exists 查询', () => {
    const params = { name: { $exists: true } };
    const result = validateFind(params, formSchema, {});
    
    expect(result.find).toEqual({ name: { $exists: true } });
  });

  it('validateFind 遇到不支持的操作符抛出 unsupportedSymbol 错误', () => {
    const params = { name: { $invalid: 'test' } };
    try {
      validateFind(params, formSchema, {});
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(VError);
      expect((e as VError).key).toBe('invalidFind');
    }
  });

  it('validateFind ignoreErrors 模式', () => {
    const schemaWithNoFindable = {
      type: 'object',
      properties: {
        secret: { type: 'string', title: '秘密' },
      }
    };
    const params = { secret: 'hidden' };
    const result = validateFind(params, schemaWithNoFindable, { ignoreErrors: true });
    
    expect(result.find).toBeUndefined();
  });

  it('validateFind 自定义 findKey', () => {
    const params = { query: { name: '张三' }, sort: ['name'] };
    const result = validateFind(params, formSchema, { findKey: 'query' });
    
    expect(result.find).toEqual({ name: '张三' });
    expect(result.sort).toEqual({ name: 1 });
  });

  it('validateFind 自定义 sortKey', () => {
    const params = { name: '张三', order: ['name'] };
    const result = validateFind(params, formSchema, { sortKey: 'order' });
    
    expect(result.find).toEqual({ name: '张三' });
    expect(result.sort).toEqual({ name: 1 });
  });

  it('validateFind state 参数', () => {
    const state: VState = {};
    const params = { name: '张三', age: 25 };
    const result = validateFind(params, formSchema, {}, state);
    
    expect(state.values).toEqual(params);
    expect(state.valids).toEqual(result);
  });

  it('validateFind cols 返回字段', () => {
    const params = { cols: { name: 1, age: 1 } };
    const result = validateFind(params, formSchema, {});
    
    expect(result.cols).toEqual({ name: 1, age: 1 });
  });

  it('validateFind cols 排除字段', () => {
    const params = { cols: { phone: 0 } };
    const result = validateFind(params, formSchema, {});
    
    expect(result.cols).toEqual({ phone: 0 });
  });

  it('validateFind 默认 cols', () => {
    const params = {};
    const result = validateFind(params, formSchema, {});
    
    expect(result.cols).toEqual({});
  });

  it('validateFind pickyMode 立即抛出错误', () => {
    const schemaWithNoFindable = {
      type: 'object',
      properties: {
        secret: { type: 'string', title: '秘密' },
      }
    };
    const params = { secret: 'hidden' };
    try {
      validateFind(params, schemaWithNoFindable, { pickyMode: true });
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(VError);
      expect((e as VError).key).toBe('invalidFind');
    }
  });

  it('validateFind 自定义 colsKey', () => {
    const params = { fields: { name: 1, age: 1 } };
    const result = validateFind(params, formSchema, { colsKey: 'fields' });
    
    expect(result.cols).toEqual({ name: 1, age: 1 });
  });

  it('validateFind 自定义 skipKey 和 limitKey', () => {
    const params = { start: 5, count: 10 };
    const result = validateFind(params, formSchema, { skipKey: 'start', limitKey: 'count' });
    
    expect(result.skip).toBe(5);
    expect(result.limit).toBe(10);
  });

  it('VState - 通过 VState.getValids() 获取校验通过的数据', () => {
    const state = new VState();
    const params = {
      name: '张三',
      age: { $gte: 18 },
      // 错误条件
      unknown_field: 'value',
      sort: ['unknown_sort']
    };

    try {
      validateFind(params, formSchema, {}, state);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(VError);
      const valids = state.getValids();
      // 校验通过的数据应该包含正确的查询条件
      expect(valids.find).toEqual({ name: '张三', age: { '$gte': 18 } });
    }
  });

  it('ignoreErrors - 忽略错误时获取部分校验成功的数据', () => {
    const params = {
      name: '张三',
      age: { $gte: 18 },
      // 错误条件（未配置字段）
      unknown_field: 'value'
    };

    const result = validateFind(params, formSchema, { ignoreErrors: true });
    
    // 应该获取到校验成功的数据
    expect(result.find).toEqual({ name: '张三', age: { '$gte': 18 } });
    // unknown_field 应该被忽略
    expect(result.find).not.toHaveProperty('unknown_field');
  });

  it('简化配置 - findable 和 sortable 数组格式', () => {
    const simpleSchema = {
      type: 'object',
      findable: ['id', 'name', 'age', 'status'],  // status 不在 properties 中
      sortable: ['name', 'age', 'score'],  // score 不在 properties 中
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        age: { type: 'integer' },
        email: { type: 'string', findable: true },
        subOne: {
          type: 'object',
          findable: ['abc', 'def']
        },
        subArr: {
          type: 'array',
          findable: ['uvw', 'xyz'],
          items: {
            type: 'object'
          }
        }
      }
    };

    const params = {
      name: '张三',
      age: { $gte: 18 },
      'subOne.abc': { $eq: 456 },
      status: 'active',  // 使用 findable 数组中的 status 字段
      sort: ['name', '-age', 'score']  // 对 score 排序
    };

    const result = validateFind(params, simpleSchema, {});

    expect(result.find).toEqual({ name: '张三', age: { '$gte': 18 }, status: 'active', 'subOne.abc': { '$eq': 456 } });
    expect(result.sort).toEqual({ name: 1, age: -1, score: 1 });
  });
});
