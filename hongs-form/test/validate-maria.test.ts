import { describe, it, expect } from 'vitest';
import { validateSqls, VError, VState } from '../src';

describe('Maria：validateSqls 新 schema 结构测试', () => {
    const userSchema = {
        type: 'object',
        tableName: 'users',
        nameAs: 'user',
        properties: {
            id: { type: 'string', findable: true },
            name: { type: 'string', findable: true },
            age: { type: 'integer', findable: true, sortable: true },
            group: {
                type: 'object',
                tableName: 'groups',
                joinOn: 'group.id = user.group_id',
                properties: {
                    id: { type: 'string', findable: true },
                    name: { type: 'string', findable: true },
                    boost: { type: 'integer', findable: true, sortable: true },
                    company: {
                        type: 'object',
                        tableName: 'companys',
                        joinOn: 'company.id = group.company_id',
                        joinType: 'LEFT',
                        properties: {
                            id: { type: 'string', findable: true },
                            name: { type: 'string', findable: true }
                        }
                    }
                }
            }
        }
    };

    it('validateSqls 需求文档示例 - 完整查询', () => {
        const params = {
            cols: ['id', 'name', 'age', 'group__name', 'group__company__name'],
            sort: { age: 1, group__boost: -1 },
            age: { $gte: 18 },
            group: {
                company: {
                    id: '1'
                }
            },
            skip: '20',
            limit: 10
        };
        
        const result = validateSqls(params, userSchema, {});
        
        expect(result.select).toBe('`user`.`id`, `user`.`name`, `user`.`age`, `group`.`name` AS `group__name`, `group__company`.`name` AS `group__company__name`');
        expect(result.where).toBe('`user`.`age` >= ? AND `group__company`.`id` = ?');
        expect(result.whereParams).toEqual([18, '1']);
        expect(result.order).toBe('`user`.`age` ASC, `group`.`boost` DESC');
        expect(result.skip).toBe(20);
        expect(result.limit).toBe(10);
        
        const sql = result.getSql();
        expect(sql).toBe('SELECT `user`.`id`, `user`.`name`, `user`.`age`, `group`.`name` AS `group__name`, `group__company`.`name` AS `group__company__name` FROM `users` AS `user` INNER JOIN `groups` AS `group` ON group.id = user.group_id LEFT JOIN `companys` AS `group__company` ON company.id = group.company_id WHERE `user`.`age` >= ? AND `group__company`.`id` = ? ORDER BY `user`.`age` ASC, `group`.`boost` DESC');
    });

    it('validateSqls 简单查询 - 无 JOIN', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'u',
            properties: {
                name: { type: 'string', findable: true, sortable: true },
                age: { type: 'number', findable: true, sortable: true }
            }
        };
        
        const params = { name: '张三', age: 25 };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.where).toBe('`u`.`name` = ? AND `u`.`age` = ?');
        expect(result.whereParams).toEqual(['张三', 25]);
        
        const sql = result.getSql();
        expect(sql).toBe('SELECT `u`.`name`, `u`.`age` FROM `users` AS `u` WHERE `u`.`name` = ? AND `u`.`age` = ?');
    });

    it('validateSqls 比较操作符', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                age: { type: 'number', findable: true, sortable: true }
            }
        };
        
        const params = { age: { $gt: 18, $lte: 30 } };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.where).toBe('`user`.`age` > ? AND `user`.`age` <= ?');
        expect(result.whereParams).toEqual([18, 30]);
    });

    it('validateSqls $in 查询', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true }
            }
        };
        
        const params = { name: { $in: ['张三', '李四'] } };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.where).toBe('`user`.`name` IN (?, ?)');
        expect(result.whereParams).toEqual(['张三', '李四']);
    });

    it('validateSqls 排序 - 对象格式', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true, sortable: true },
                age: { type: 'number', findable: true, sortable: true }
            }
        };
        
        const params = { sort: { name: 1, age: -1 } };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.order).toBe('`user`.`name` ASC, `user`.`age` DESC');
    });

    it('validateSqls 排序 - 数组格式（升序）', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true, sortable: true },
                age: { type: 'number', findable: true, sortable: true }
            }
        };
        
        const params = { sort: ['name', 'age'] };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.order).toBe('`user`.`name` ASC, `user`.`age` ASC');
    });

    it('validateSqls 排序 - 数组格式（感叹号降序）', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true, sortable: true },
                age: { type: 'number', findable: true, sortable: true }
            }
        };
        
        const params = { sort: ['name', 'age!'] };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.order).toBe('`user`.`name` ASC, `user`.`age` DESC');
    });

    it('validateSqls 排序 - 数组格式（混合排序）', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true, sortable: true },
                age: { type: 'number', findable: true, sortable: true }
            }
        };
        
        const params = { sort: ['age!', 'name'] };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.order).toBe('`user`.`age` DESC, `user`.`name` ASC');
    });

    it('validateSqls 排序 - 数组格式（双下划线字段）', () => {
        const params = { sort: ['age', 'group__boost!'] };
        const result = validateSqls(params, userSchema, {});
        
        expect(result.order).toBe('`user`.`age` ASC, `group`.`boost` DESC');
    });

    it('validateSqls 排序 - 数组格式（减号前缀降序，兼容 Django）', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true, sortable: true },
                age: { type: 'number', findable: true, sortable: true }
            }
        };
        
        const params = { sort: ['name', '-age'] };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.order).toBe('`user`.`name` ASC, `user`.`age` DESC');
    });

    it('validateSqls 排序 - 数组格式（减号前缀混合排序）', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true, sortable: true },
                age: { type: 'number', findable: true, sortable: true }
            }
        };
        
        const params = { sort: ['-age', 'name'] };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.order).toBe('`user`.`age` DESC, `user`.`name` ASC');
    });

    it('validateSqls 排序 - 数组格式（减号前缀双下划线字段）', () => {
        const params = { sort: ['age', '-group__boost'] };
        const result = validateSqls(params, userSchema, {});
        
        expect(result.order).toBe('`user`.`age` ASC, `group`.`boost` DESC');
    });

    it('validateSqls 排序 - 数组格式（感叹号和减号混用）', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true, sortable: true },
                age: { type: 'number', findable: true, sortable: true }
            }
        };
        
        const params = { sort: ['name!', '-age'] };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.order).toBe('`user`.`name` DESC, `user`.`age` DESC');
    });

    it('validateSqls 双下划线字段查询', () => {
        const params = { group__name: '技术部' };
        const result = validateSqls(params, userSchema, {});
        
        expect(result.where).toBe('`group`.`name` = ?');
        expect(result.whereParams).toEqual(['技术部']);
    });

    it('validateSqls 嵌套对象查询', () => {
        const params = {
            group: {
                id: '1'
            }
        };
        const result = validateSqls(params, userSchema, {});
        
        expect(result.where).toBe('`group`.`id` = ?');
        expect(result.whereParams).toEqual(['1']);
    });

    it('validateSqls 错误处理 - 不可查询字段', () => {
        const schemaWithNoFindable = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                secret: { type: 'string' }
            }
        };
        
        const params = { secret: 'hidden' };
        try {
            validateSqls(params, schemaWithNoFindable, {});
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeInstanceOf(VError);
            expect((e as VError).key).toBe('invalidSqls');
        }
    });

    it('validateSqls skip 和 limit', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true }
            }
        };
        
        const params = { skip: 10, limit: 20 };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.skip).toBe(10);
        expect(result.limit).toBe(20);
    });

    it('validateSqls cols 数组格式', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true },
                age: { type: 'number', findable: true }
            }
        };
        
        const params = { cols: ['name', 'age'] };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.cols).toEqual(['name', 'age']);
        expect(result.select).toBe('`user`.`name`, `user`.`age`');
    });

    it('validateSqls $and 逻辑操作符', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true },
                age: { type: 'number', findable: true }
            }
        };
        
        const params = { $and: [{ name: '张三' }, { age: { $gt: 18 } }] };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.where).toBe('(`user`.`name` = ? AND `user`.`age` > ?)');
        expect(result.whereParams).toEqual(['张三', 18]);
    });

    it('validateSqls $or 逻辑操作符', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true },
                age: { type: 'number', findable: true }
            }
        };
        
        const params = { $or: [{ name: '张三' }, { age: { $lt: 25 } }] };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.where).toBe('(`user`.`name` = ? OR `user`.`age` < ?)');
        expect(result.whereParams).toEqual(['张三', 25]);
    });

    it('validateSqls $regex 查询', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true }
            }
        };
        
        const params = { name: { $regex: '张' } };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.where).toBe('`user`.`name` REGEXP ?');
        expect(result.whereParams).toEqual(['张']);
    });

    it('validateSqls $exists 查询', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true }
            }
        };
        
        const params = { name: { $exists: true } };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.where).toBe('`user`.`name` IS NOT NULL');
    });

    it('validateSqls $nin 查询', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true }
            }
        };
        
        const params = { name: { $nin: ['张三', '李四'] } };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.where).toBe('`user`.`name` NOT IN (?, ?)');
        expect(result.whereParams).toEqual(['张三', '李四']);
    });

    it('validateSqls state 参数', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true },
                age: { type: 'number', findable: true }
            }
        };
        
        const state: VState = {};
        const params = { name: '张三', age: 25 };
        const result = validateSqls(params, simpleSchema, {}, state);
        
        expect(state.values).toEqual(params);
        expect(state.valids).toEqual(result);
    });

    it('validateSqls getParams 方法', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true },
                age: { type: 'number', findable: true }
            }
        };
        
        const params = { name: '张三', age: { $gt: 18 } };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.getParams()).toEqual(['张三', 18]);
    });

    it('validateSqls pickyMode 立即抛出错误', () => {
        const schemaWithNoFindable = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                secret: { type: 'string' }
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
            tableName: 'users',
            nameAs: 'user',
            properties: {
                secret: { type: 'string' }
            }
        };
        
        const params = { secret: 'hidden' };
        const result = validateSqls(params, schemaWithNoFindable, { ignoreErrors: true });

        expect(result.where).toBe('');
    });

    it('validateSqls 多层嵌套 JOIN', () => {
        const params = {
            cols: ['id', 'group__name', 'group__company__name'],
            group__company__id: '2'
        };
        const result = validateSqls(params, userSchema, {});
        
        expect(result.where).toBe('`group__company`.`id` = ?');
        expect(result.whereParams).toEqual(['2']);
        
        const sql = result.getSql();
        expect(sql).toContain('INNER JOIN `groups` AS `group`');
        expect(sql).toContain('LEFT JOIN `companys` AS `group__company`');
    });

    it('validateSqls 字符串 skip/limit 自动转换', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true }
            }
        };
        
        const params = { skip: '20', limit: '10' };
        const result = validateSqls(params, simpleSchema, {});
        
        expect(result.skip).toBe(20);
        expect(result.limit).toBe(10);
    });

    // ============ 注入防御测试 ============
    it('注入防御 - 未配置字段的查询条件被拦截', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true }
            }
        };
        
        const params = { 
            name: '张三',
            // 以下字段未在 schema 中配置
            unknown_field: 'value',
            other_field: { $gt: 10 }
        };
        
        try {
            validateSqls(params, simpleSchema, {});
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeInstanceOf(VError);
            expect((e as VError).key).toBe('invalidSqls');
        }
    });

    it('注入防御 - SQL 注入字符串无法进入 WHERE 子句', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true }
            }
        };
        
        const maliciousInput = {
            name: "' OR '1'='1"
        };
        
        const result = validateSqls(maliciousInput, simpleSchema, { ignoreErrors: true });
        
        expect(result.where).toBe('`user`.`name` = ?');
        expect(result.whereParams).toEqual(["' OR '1'='1"]);
    });

    it('注入防御 - 未配置字段的排序被拦截', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true, sortable: true }
            }
        };
        
        const params = { sort: { unknown_field: 1 } };
        
        try {
            validateSqls(params, simpleSchema, {});
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeInstanceOf(VError);
            expect((e as VError).key).toBe('invalidSqls');
        }
    });

    it('注入防御 - 数组排序中未配置字段被拦截', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true, sortable: true }
            }
        };
        
        const params = { sort: ['name', 'unknown_field!'] };
        
        try {
            validateSqls(params, simpleSchema, {});
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeInstanceOf(VError);
            expect((e as VError).key).toBe('invalidSqls');
        }
    });

    it('VState - 通过 VState.getValids() 获取校验通过的数据', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true },
                age: { type: 'integer', findable: true, sortable: true }
            }
        };

        const state = new VState();
        const params = {
            name: '张三',
            age: { $gte: 18 },
            // 错误条件
            unknown_field: 'value',
            invalid_sort: { age: 'invalid' }
        };

        try {
            validateSqls(params, simpleSchema, {}, state);
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeInstanceOf(VError);
            const valids = state.getValids();
            // 校验通过的数据应该包含正确的查询条件
            expect(valids.where).toBe('`user`.`name` = ? AND `user`.`age` >= ?');
            expect(valids.whereParams).toEqual(['张三', 18]);
        }
    });

    it('ignoreErrors - 忽略错误时获取部分校验成功的数据', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true },
                age: { type: 'integer', findable: true, sortable: true }
            }
        };

        const params = {
            name: '张三',
            age: { $gte: 18 },
            // 错误条件（未配置字段）
            unknown_field: 'value'
        };

        const result = validateSqls(params, simpleSchema, { ignoreErrors: true });
        
        // 应该获取到校验成功的数据
        expect(result.where).toBe('`user`.`name` = ? AND `user`.`age` >= ?');
        expect(result.whereParams).toEqual(['张三', 18]);
        // unknown_field 应该被忽略
        expect(result.where).not.toContain('unknown_field');
    });

    it('levelSep - 使用点号作为层级分隔符', () => {
        const schema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                id: { type: 'string', findable: true },
                name: { type: 'string', findable: true },
                dept: {
                    type: 'object',
                    tableName: 'departments',
                    nameAs: 'dept',
                    joinOn: 'dept.id = user.dept_id',
                    properties: {
                        name: { type: 'string', findable: true }
                    }
                }
            }
        };

        const params = {
            'dept.name': '技术部',
            cols: ['id', 'name', 'dept.name']
        };

        const result = validateSqls(params, schema, { levelSep: '.' });
        
        // 使用点号分隔符
        expect(result.where).toBe('`dept`.`name` = ?');
        expect(result.whereParams).toEqual(['技术部']);
        expect(result.cols).toEqual(['id', 'name', 'dept.name']);
        expect(result.select).toBe('`user`.`id`, `user`.`name`, `dept`.`name` AS `dept.name`');
    });

    it('levelSep - 点号模式下的注入防御', () => {
        const schema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                id: { type: 'string', findable: true },
                name: { type: 'string', findable: true },
                dept: {
                    type: 'object',
                    tableName: 'departments',
                    nameAs: 'dept',
                    joinOn: 'dept.id = user.dept_id',
                    properties: {
                        name: { type: 'string', findable: true }
                    }
                }
            }
        };

        // 使用点号分隔符，但传入双下划线格式的未配置字段
        const params = {
            'dept__name': '技术部'
        };

        try {
            validateSqls(params, schema, { levelSep: '.' });
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeInstanceOf(VError);
            expect((e as VError).key).toBe('invalidSqls');
        }
    });


    it('注入防御 - 未配置字段不进入 SELECT 子句', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true }
            }
        };
        
        const params = { cols: ['name', 'password', 'secret_field'] };
        const result = validateSqls(params, simpleSchema, { ignoreErrors: true });
        
        expect(result.select).toBe('`user`.`name`');
        expect(result.cols).toEqual(['name']);
    });

    it('注入防御 - ignoreErrors 模式下未配置字段被忽略', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true }
            }
        };
        
        const params = { 
            name: '张三',
            malicious_field: "'); DROP TABLE users; --"
        };
        
        const result = validateSqls(params, simpleSchema, { ignoreErrors: true });
        
        expect(result.where).toBe('`user`.`name` = ?');
        expect(result.whereParams).toEqual(['张三']);
    });

    it('注入防御 - 嵌套对象中未配置字段被拦截', () => {
        const params = {
            group: {
                unknown_field: 'value',
                name: '技术部'
            }
        };
        
        try {
            validateSqls(params, userSchema, {});
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeInstanceOf(VError);
            expect((e as VError).key).toBe('invalidSqls');
        }
    });

    it('注入防御 - 双下划线格式未配置字段被拦截', () => {
        const params = { group__unknown_field: 'value' };
        
        try {
            validateSqls(params, userSchema, {});
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeInstanceOf(VError);
            expect((e as VError).key).toBe('invalidSqls');
        }
    });

    it('注入防御 - 排序字段包含 SQL 注入被拦截', () => {
        const simpleSchema = {
            type: 'object',
            tableName: 'users',
            nameAs: 'user',
            properties: {
                name: { type: 'string', findable: true, sortable: true }
            }
        };
        
        const params = { sort: ['name', 'name; DROP TABLE users--'] };
        
        try {
            validateSqls(params, simpleSchema, {});
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeInstanceOf(VError);
            expect((e as VError).key).toBe('invalidSqls');
        }
    });
});
