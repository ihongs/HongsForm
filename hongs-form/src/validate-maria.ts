import { VState, VError } from './types.js';

// 校验并转为 SQL 片段，参数结构同 MongoDB
// config.ignoreErrors: 忽略校验错误，默认 false
// config.findKey: 自定义查询参数键名，默认不设，从顶层开始
// config.colsKey: 自定义返回字段参数键名，默认 'cols'
// config.sortKey: 自定义排序字段参数键名，默认 'sort'
// config.skipKey: 自定义跳过行数参数键名，默认 'skip'
// config.limitKey: 自定义限定行数参数键名，默认 'limit'
export const validateSqls = function (params: any, schema: any, config: any, state?: VState) {
    const properties = schema?.properties || {};
    let { findKey, sortKey, skipKey, limitKey, colsKey } = config || {};
    colsKey = colsKey || 'cols';
    sortKey = sortKey || 'sort';
    skipKey = skipKey || 'skip';
    limitKey = limitKey || 'limit';
    
    // 构建结果对象（提前初始化，便于 state 跟踪）
    const result: any = {
        where: '',
        whereParams: [],
        order: '',
        orderParams: [],
        select: '',
        selectParams: [],
        joins: [],
        limit: 1,
        skip: 0,
        cols: [],
    };
    
    const errors: Record<string, VError> = {};
    
    // 提前设置 state，用户可以在异常时获取已校验的数据
    if (state) {
        state.values = params;
        state.valids = result;
    }
    
    // 支持的 MongoDB 操作符到 SQL 的映射
    const operatorMap: Record<string, string> = {
        '$eq': '=',
        '$ne': '!=',
        '$lt': '<',
        '$lte': '<=',
        '$gt': '>',
        '$gte': '>=',
    };
    
    /**
     * 检查字段是否可查询（支持嵌套字段如 'join_table.field'）
     */
    const isFindable = (fieldPath: string): boolean => {
        // 直接检查完整路径
        if (properties[fieldPath]) {
            return (properties[fieldPath] as any).findable === true;
        }
        
        // 检查嵌套路径
        for (const [key, val] of Object.entries(properties)) {
            if (fieldPath === key || fieldPath.startsWith(key + '.')) {
                if ((val as any).findable === true) return true;
                // 检查嵌套对象中的属性
                const nestedProps = (val as any)?.properties;
                if (nestedProps) {
                    const remainingPath = fieldPath.substring(key.length + 1);
                    if (nestedProps[remainingPath]?.findable === true) {
                        return true;
                    }
                }
            }
        }
        return false;
    };
    
    /**
     * 检查字段是否可排序（支持嵌套字段如 'join_table.field'）
     */
    const isSortable = (fieldPath: string): boolean => {
        // 直接检查完整路径
        if (properties[fieldPath]) {
            return (properties[fieldPath] as any).sortable === true;
        }
        
        // 检查嵌套路径
        for (const [key, val] of Object.entries(properties)) {
            if (fieldPath === key || fieldPath.startsWith(key + '.')) {
                if ((val as any).sortable === true) return true;
                // 检查嵌套对象中的属性
                const nestedProps = (val as any)?.properties;
                if (nestedProps) {
                    const remainingPath = fieldPath.substring(key.length + 1);
                    if (nestedProps[remainingPath]?.sortable === true) {
                        return true;
                    }
                }
            }
        }
        return false;
    };
    
    /**
     * 解析字段路径，返回表名和字段名
     * 支持二级字段如 'join_table.field'
     */
    const parseFieldPath = (fieldPath: string): { table: string | null; field: string; fullField: string } => {
        const parts = fieldPath.split('.');
        if (parts.length === 2) {
            return {
                table: parts[0],
                field: parts[1],
                fullField: `${parts[0]}.${parts[1]}`
            };
        }
        return {
            table: null,
            field: fieldPath,
            fullField: fieldPath
        };
    };
    
    /**
     * 将 MongoDB 查询条件转换为 SQL WHERE 子句
     */
    const buildWhere = (query: any, parentPath: string = ''): { sql: string; params: any[]; joins: string[] } => {
        if (!query || typeof query !== 'object') {
            return { sql: '', params: [], joins: [] };
        }
        
        const sqlParts: string[] = [];
        const params: any[] = [];
        const joins: Set<string> = new Set();
        
        for (const [key, val] of Object.entries(query)) {
            const currentPath = parentPath ? `${parentPath}.${key}` : key;
            
            // MongoDB 操作符
            if (key.startsWith('$')) {
                switch (key) {
                    case '$and':
                    case '$or': {
                        const conditions = (val as any[]).map(item => buildWhere(item, ''));
                        const validConditions = conditions.filter(c => c.sql);
                        if (validConditions.length > 0) {
                            const operator = key === '$and' ? 'AND' : 'OR';
                            sqlParts.push(`(${validConditions.map(c => c.sql).join(` ${operator} `)})`);
                            validConditions.forEach(c => params.push(...c.params));
                            validConditions.forEach(c => c.joins.forEach(j => joins.add(j)));
                        }
                        break;
                    }
                    case '$in': {
                        const field = parentPath;
                        if (!isFindable(field)) {
                            errors[field] = new VError('findable');
                            if (config.pickyMode) {
                                throw new VError('invalidSqls', undefined, errors);
                            }
                            continue;
                        }
                        const parsed = parseFieldPath(field);
                        if (parsed.table) joins.add(parsed.table);
                        if (Array.isArray(val) && val.length > 0) {
                            params.push(...val);
                            sqlParts.push(`${parsed.fullField} IN (${val.map(() => '?').join(', ')})`);
                        }
                        break;
                    }
                    case '$nin': {
                        const field = parentPath;
                        if (!isFindable(field)) {
                            errors[field] = new VError('findable');
                            if (config.pickyMode) {
                                throw new VError('invalidSqls', undefined, errors);
                            }
                            continue;
                        }
                        const parsed = parseFieldPath(field);
                        if (parsed.table) joins.add(parsed.table);
                        if (Array.isArray(val) && val.length > 0) {
                            params.push(...val);
                            sqlParts.push(`${parsed.fullField} NOT IN (${val.map(() => '?').join(', ')})`);
                        }
                        break;
                    }
                    case '$exists': {
                        const field = parentPath;
                        if (!isFindable(field)) {
                            errors[field] = new VError('findable');
                            if (config.pickyMode) {
                                throw new VError('invalidSqls', undefined, errors);
                            }
                            continue;
                        }
                        const parsed = parseFieldPath(field);
                        if (parsed.table) joins.add(parsed.table);
                        if (val) {
                            sqlParts.push(`${parsed.fullField} IS NOT NULL`);
                        } else {
                            sqlParts.push(`${parsed.fullField} IS NULL`);
                        }
                        break;
                    }
                    case '$regex': {
                        const field = parentPath;
                        if (!isFindable(field)) {
                            errors[field] = new VError('findable');
                            if (config.pickyMode) {
                                throw new VError('invalidSqls', undefined, errors);
                            }
                            continue;
                        }
                        const parsed = parseFieldPath(field);
                        if (parsed.table) joins.add(parsed.table);
                        params.push(val);
                        sqlParts.push(`${parsed.fullField} REGEXP ?`);
                        break;
                    }
                    default: {
                        // 比较操作符
                        const sqlOp = operatorMap[key];
                        if (sqlOp) {
                            const field = parentPath;
                            if (!isFindable(field)) {
                                errors[field] = new VError('findable');
                                if (config.pickyMode) {
                                    throw new VError('invalidSqls', undefined, errors);
                                }
                                continue;
                            }
                            const parsed = parseFieldPath(field);
                            if (parsed.table) joins.add(parsed.table);
                            params.push(val);
                            sqlParts.push(`${parsed.fullField} ${sqlOp} ?`);
                        } else {
                            errors[key] = new VError('unsupportedSymbol', {value: key});
                            if (config.pickyMode) {
                                throw new VError('invalidSqls', undefined, errors);
                            }
                        }
                    }
                }
            } else {
                // 普通字段 - 可能是简单值或嵌套对象
                if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                    // 嵌套对象，继续递归处理
                    const nested = buildWhere(val, currentPath);
                    if (nested.sql) {
                        sqlParts.push(nested.sql);
                        params.push(...nested.params);
                        nested.joins.forEach(j => joins.add(j));
                    }
                } else {
                    // 简单值，默认等于
                    if (!isFindable(currentPath)) {
                        errors[currentPath] = new VError('findable');
                        if (config.pickyMode) {
                            throw new VError('invalidSqls', undefined, errors);
                        }
                        continue;
                    }
                    const parsed = parseFieldPath(currentPath);
                    if (parsed.table) joins.add(parsed.table);
                    params.push(val);
                    sqlParts.push(`${parsed.fullField} = ?`);
                }
            }
        }
        
        return {
            sql: sqlParts.join(' AND '),
            params,
            joins: Array.from(joins)
        };
    };
    
    /**
     * 将 MongoDB 排序转换为 SQL ORDER BY 子句
     */
    const buildOrder = (sort: any[]): { sql: string; params: any[]; joins: string[] } => {
        if (!Array.isArray(sort)) {
            return { sql: '', params: [], joins: [] };
        }
        
        const orderParts: string[] = [];
        const joins: Set<string> = new Set();
        
        for (const item of sort) {
            if (typeof item === 'string') {
                if (!isSortable(item)) {
                    errors[item] = new VError('sortable');
                    if (config.pickyMode) {
                        throw new VError('invalidSqls', undefined, errors);
                    }
                    continue;
                }
                const parsed = parseFieldPath(item);
                if (parsed.table) joins.add(parsed.table);
                orderParts.push(`${parsed.fullField} ASC`);
            } else if (typeof item === 'object' && item !== null) {
                const [key, order] = Object.entries(item)[0];
                if (!isSortable(key)) {
                    errors[key] = new VError('sortable');
                    if (config.pickyMode) {
                        throw new VError('invalidSqls', undefined, errors);
                    }
                    continue;
                }
                const parsed = parseFieldPath(key);
                if (parsed.table) joins.add(parsed.table);
                const direction = order === -1 ? 'DESC' : 'ASC';
                orderParts.push(`${parsed.fullField} ${direction}`);
            }
        }
        
        return {
            sql: orderParts.join(', '),
            params: [],
            joins: Array.from(joins)
        };
    };
    
    // 解构参数，分离 find、cols、sort、skip、limit
    let findData: any, sortData: any, skipData: any, limitData: any, colsData: any;
    if (findKey !== undefined) {
        ({ [sortKey]: sortData, [skipKey]: skipData, [limitKey]: limitData, [colsKey]: colsData, [findKey]: findData } = params);
    } else {
        ({ [sortKey]: sortData, [skipKey]: skipData, [limitKey]: limitData, [colsKey]: colsData, ...findData } = params);
    }
    
    // 构建 WHERE 子句
    const whereResult = buildWhere(findData);
    
    // 构建 ORDER BY 子句
    const orderResult = buildOrder(sortData);
    
    // 合并关联表
    const allJoins = [...new Set([...whereResult.joins, ...orderResult.joins])];
    
    // 更新结果对象（直接更新，保持 state 引用）
    result.where = whereResult.sql;
    result.whereParams = whereResult.params;
    result.order = orderResult.sql;
    result.orderParams = orderResult.params;
    result.joins = allJoins;
    result.skip  = skipData  !== undefined && typeof skipData  === 'number' && skipData  >= 0 ? skipData  : 0;
    result.limit = limitData !== undefined && typeof limitData === 'number' && limitData >= 1 ? limitData : 1;
    
    // 处理返回字段 cols
    // cols 结构: {field_name: 0|1}
    // 如果没有值为 1 的字段，返回所有 properties 的字段名
    // 如果有值为 0 的字段，从字段列表中排除
    if (colsData && typeof colsData === 'object') {
        const colsArray: string[] = [];
        const excludeCols: string[] = [];
        let hasInclude = false;
        
        for (const [key, val] of Object.entries(colsData)) {
            if (val === 1) {
                colsArray.push(key);
                hasInclude = true;
            } else if (val === 0) {
                excludeCols.push(key);
            }
        }
        
        if (hasInclude) {
            // 有明确的 include 字段，使用 include 列表
            result.cols = colsArray;
        } else {
            // 没有 include 字段，返回所有非嵌套对象的 properties，排除 exclude 列表中的字段
            const allProps = Object.keys(properties).filter(key => {
                const prop = properties[key];
                return !prop || prop.type !== 'object';
            });
            result.cols = excludeCols.length > 0 
                ? allProps.filter(p => !excludeCols.includes(p)) 
                : allProps;
        }
    } else {
        // 没有指定 cols，返回所有非嵌套对象的 properties 的字段名
        result.cols = Object.keys(properties).filter(key => {
            const prop = properties[key];
            return !prop || prop.type !== 'object';
        });
    }
    
    // 生成 SELECT 子句
    result.select = result.cols.join(', ') || '*';
    
    /**
     * 获取完整的 SQL 语句
     * @param tableName - 表名
     * @param joinTables - 自定义 JOIN 配置，格式: { [tableAlias]: { on: string, to?: string } }，to 可选，默认使用 tableAlias 作为实际表名
     * @returns 完整的 SQL 语句
     */
    result.getSql = function (tableName: string, joinTables?: Record<string, { on: string; to?: string }>): string {
        const sqlParts: string[] = [];
        
        // SELECT 子句
        sqlParts.push(`SELECT ${this.select}`);
        
        // FROM 子句
        sqlParts.push(`FROM ${tableName}`);
        
        // JOIN 子句
        if (this.joins.length > 0) {
            for (let i = 0; i < this.joins.length; i ++) {
                let joinTable = this.joins[i];
                if (joinTables && joinTables[joinTable]) {
                    // 使用自定义 JOIN 配置
                    const joinParam = joinTables[joinTable];
                    const joinWhere = joinParam.on || '1=1';
                    const realTable = joinParam.to || joinTable;
                    if (realTable) {
                        // 指定了实际表名，需要添加 AS 别名
                        sqlParts.push(`JOIN ${realTable} AS ${joinTable} ON ${joinWhere}`);
                    } else {
                        // 未指定实际表名，直接使用 joinTable
                        sqlParts.push(`JOIN ${joinTable} ON ${joinWhere}`);
                    }
                } else {
                    // 默认 JOIN
                    sqlParts.push(`JOIN ${joinTable} ON 1=1`);
                }
            };
        }
        
        // WHERE 子句
        if (this.where) {
            sqlParts.push(`WHERE ${this.where}`);
        }
        
        // ORDER BY 子句
        if (this.order) {
            sqlParts.push(`ORDER BY ${this.order}`);
        }
        
        // LIMIT 子句
        sqlParts.push(`LIMIT ${this.skip}, ${this.limit}`);
        
        return sqlParts.join(' ');
    };
    
    /**
     * 获取所有参数的合并数组
     * @returns 按顺序排列的所有参数
     */
    result.getParams = function (): any[] {
        return [...this.selectParams, ...this.whereParams, ...this.orderParams];
    };
    
    // 如果有错误且不是忽略错误模式，则抛出异常
    if (Object.keys(errors).length > 0 && !config.ignoreErrors) {
        throw new VError('invalidSqls', undefined, errors);
    }
    
    // 如果有 state，放入结果
    if (state) {
        state.values = params;
        state.valids = result;
    }
    
    return result;
}
