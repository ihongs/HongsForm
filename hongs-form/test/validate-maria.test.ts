import { describe, it, expect } from 'vitest';
import { validateSqls, VError, VState } from '../src';

// ==============================================
// Maria：validateSqls SQL 片段生成
// ==============================================

describe('Maria：validateSqls SQL 片段生成', () => {
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
  });

  it('validateSqls 比较操作符', () => {
    const params = { age: { $gt: 18, $lte: 30 } };
    const result = validateSqls(params, formSchema, {});
    
    expect(result.where).toBe('age > ? AND age <= ?');
    expect(result.whereParams).toEqual([18, 30]);
  });

  it('validateSqls $in 查询', () => {
    const params = { name: { $in: ['张三', '李四'] } };
    const result = validateSqls(params, formSchema, {});
    
    expect(result.where).toBe('name IN (?, ?)');
    expect(result.whereParams).toEqual(['张三', '李四']);
  });

  it('validateSqls 排序', () => {
    const params = { sort: ['name', { age: -1 }] };
    const result = validateSqls(params, formSchema, {});
    
    expect(result.order).toBe('name ASC, age DESC');
  });

  it('validateSqls 关联表字段', () => {
    const params = { 'join_table.field': 'value' };
    const result = validateSqls(params, formSchema, {});
    
    expect(result.where).toBe('join_table.field = ?');
    expect(result.joins).toEqual(['join_table']);
  });

  it('validateSqls 错误处理', () => {
    const params = { phone: '123456' };
    try {
      validateSqls(params, formSchema, {});
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(VError);
      expect((e as VError).key).toBe('invalidSqls');
    }
  });

  it('validateSqls 生成 skip 和 limit', () => {
    const params = { skip: 10, limit: 20 };
    const result = validateSqls(params, formSchema, {});
    
    expect(result.skip).toBe(10);
    expect(result.limit).toBe(20);
  });

  it('validateSqls cols 返回字段', () => {
    const params = { cols: { name: 1, age: 1 } };
    const result = validateSqls(params, formSchema, {});
    
    expect(result.cols).toEqual(['name', 'age']);
    expect(result.select).toBe('name, age');
  });

  it('validateSqls cols 排除字段', () => {
    const params = { cols: { phone: 0 } };
    const result = validateSqls(params, formSchema, {});
    
    expect(result.cols).toEqual(['name', 'age']);
  });

  it('validateSqls $and 逻辑操作符', () => {
    const params = { $and: [{ name: '张三' }, { age: { $gt: 18 } }] };
    const result = validateSqls(params, formSchema, {});
    
    expect(result.where).toBe('(name = ? AND age > ?)');
    expect(result.whereParams).toEqual(['张三', 18]);
  });

  it('validateSqls $or 逻辑操作符', () => {
    const params = { $or: [{ name: '张三' }, { age: { $lt: 25 } }] };
    const result = validateSqls(params, formSchema, {});
    
    expect(result.where).toBe('(name = ? OR age < ?)');
    expect(result.whereParams).toEqual(['张三', 25]);
  });

  it('validateSqls $regex 查询', () => {
    const params = { name: { $regex: '张' } };
    const result = validateSqls(params, formSchema, {});
    
    expect(result.where).toBe('name REGEXP ?');
    expect(result.whereParams).toEqual(['张']);
  });

  it('validateSqls $exists 查询', () => {
    const params = { name: { $exists: true } };
    const result = validateSqls(params, formSchema, {});
    
    expect(result.where).toBe('name IS NOT NULL');
  });

  it('validateSqls $nin 查询', () => {
    const params = { name: { $nin: ['张三', '李四'] } };
    const result = validateSqls(params, formSchema, {});
    
    expect(result.where).toBe('name NOT IN (?, ?)');
    expect(result.whereParams).toEqual(['张三', '李四']);
  });

  it('validateSqls state 参数', () => {
    const state: VState = {};
    const params = { name: '张三', age: 25 };
    const result = validateSqls(params, formSchema, {}, state);
    
    expect(state.values).toEqual(params);
    expect(state.valids).toEqual(result);
  });

  it('validateSqls getSql 方法', () => {
    const params = { name: '张三', age: { $gt: 18 }, sort: ['age'], skip: 10, limit: 20 };
    const result = validateSqls(params, formSchema, {});
    
    const sql = result.getSql('users');
    expect(sql).toBe('SELECT name, age, phone FROM users WHERE name = ? AND age > ? ORDER BY age ASC');
    expect(result.getParams()).toEqual(['张三', 18]);
    expect(result.skip).toBe(10);
    expect(result.limit).toBe(20);
  });

  it('validateSqls getSql 带关联表', () => {
    const params = { 'join_table.field': 'test', sort: ['join_table.field'] };
    const result = validateSqls(params, formSchema, {});
    
    const sql = result.getSql('users');
    expect(sql).toBe('SELECT name, age, phone FROM users JOIN join_table ON 1=1 WHERE join_table.field = ? ORDER BY join_table.field ASC');
  });

  it('validateSqls getSql 自定义 JOIN 配置', () => {
    const params = { 'join_table.field': 'test' };
    const result = validateSqls(params, formSchema, {});
    
    const sql = result.getSql('users', {
      join_table: { on: 'users.id = join_table.user_id' }
    });
    expect(sql).toBe('SELECT name, age, phone FROM users JOIN join_table AS join_table ON users.id = join_table.user_id WHERE join_table.field = ?');
  });

  it('validateSqls getSql 自定义表名', () => {
    const params = { 'join_table.field': 'test' };
    const result = validateSqls(params, formSchema, {});

    const sql = result.getSql('users', {
      join_table: { on: 'users.id = profiles.user_id', to: 'profiles' }
    });
    expect(sql).toBe('SELECT name, age, phone FROM users JOIN profiles AS join_table ON users.id = profiles.user_id WHERE join_table.field = ?');
  });

  it('validateSqls pickyMode 立即抛出错误', () => {
    const schemaWithNoFindable = {
      type: 'object',
      properties: {
        secret: { type: 'string', title: '秘密' },
      }
    };
    const params = { secret: 'hidden' };
    try {
      validateSqls(params, schemaWithNoFindable, { pickyMode: true });
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(VError);
      expect((e as VError).key).toBe('invalidSqls');
    }
  });

  it('validateSqls ignoreErrors 模式', () => {
    const schemaWithNoFindable = {
      type: 'object',
      properties: {
        secret: { type: 'string', title: '秘密' },
      }
    };
    const params = { secret: 'hidden' };
    const result = validateSqls(params, schemaWithNoFindable, { ignoreErrors: true });

    expect(result.where).toBe('');
  });
});
