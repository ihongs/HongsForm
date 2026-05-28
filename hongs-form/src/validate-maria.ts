import { VState, VError } from './types.js';

/**
 * 表信息接口
 * 用于存储从 schema 解析出的表结构信息
 */
interface TableInfo {
    tableName: string;
    nameAs: string;
    joinOn?: string;
    joinType?: string;
    parentPath: string;
    fullPath: string;
}

/**
 * 字段信息接口
 * 用于存储从 schema 解析出的字段信息
 */
interface FieldInfo {
    tableAlias: string;
    fieldName: string;
    fullPath: string;
    findable: boolean;
    sortable: boolean;
}

/**
 * 校验并转为 SQL 片段，参数结构同 MongoDB
 * 
 * 新版本特性：
 * - toSql() 不再需要参数指定表名、关联等
 * - 改为 schema 内部通过 {tableName, nameAs, joinOn, joinType} 来指定
 * - 支持双下划线格式（如 group__name）和嵌套对象格式的字段路径
 * 
 * @param params - 查询参数，包含 cols, sort, skip, limit 及查询条件
 * @param schema - 表结构定义，包含 tableName, nameAs, properties 等
 * @param config - 配置选项
 * @param state - 状态对象，用于跟踪校验过程
 * @returns SQL 片段结果对象
 * 
 * @example
 * const schema = {
 *   type: 'object',
 *   tableName: 'users',
 *   nameAs: 'user',
 *   properties: {
 *     id: { type: 'string', findable: true },
 *     name: { type: 'string', findable: true },
 *     group: {
 *       type: 'object',
 *       tableName: 'groups',
 *       joinOn: 'group.id = user.group_id',
 *       properties: {
 *         name: { type: 'string', findable: true }
 *       }
 *     }
 *   }
 * };
 * 
 * const params = { name: '张三', group__name: '技术部' };
 * const result = validateSqls(params, schema, {});
 * const sql = result.toSql();
 */
export const validateSqls = function (params: any, schema: any, config: any, state?: VState) {
    const { findKey, sortKey, skipKey, limitKey, colsKey, quoteType, levelSep } = config || {};
    const _colsKey = colsKey || 'cols';
    const _sortKey = sortKey || 'sort';
    const _skipKey = skipKey || 'skip';
    const _limitKey = limitKey || 'limit';
    
    /**
     * 层级分隔符
     * - '__': 双下划线（默认）
     * - '.': 点号
     */
    const _levelSep = (levelSep === '.' || levelSep === '__') ? levelSep : '__';
    
    /**
     * 字段引用类型
     * - BTICK: MariaDB/MySQL 的反引号 `（默认）
     * - QUOTE: ANSI_QUOTES 模式的双引号 "
     * - BRACK: SQL Server 的方括号 []
     */
    const _quoteType = quoteType || 'BTICK';
    
    /**
     * 字段引用函数工厂
     * 根据配置返回对应的字段引用函数
     */
    const getQuoteFn = (type: '``' | '""' | "[]" | 'BTICK' | 'QUOTE' | 'BRACK') => {
        switch (type) {
            case '""':
            case 'QUOTE':
                return (name: string) => `"${name}"`;
            case "[]":
            case 'BRACK':
                return (name: string) => `[${name}]`;
            case '``':
            case 'BTICK':
            default:
                return (name: string) => `\`${name}\``;
        }
    };
    
    /**
     * 引用单个名称（字段名、表名、别名）
     */
    const quote = getQuoteFn(_quoteType);
    
    /**
     * 引用完整的字段（表别名.字段名）
     */
    const quoteField = (tableAlias: string, fieldName: string) => {
        return `${quote(tableAlias)}.${quote(fieldName)}`;
    };
    
    const result: any = {
        where: '',
        whereParams: [],
        order: '',
        orderParams: [],
        select: '',
        selectParams: [],
        joins: [],
        cols: [],
        skip: 0,
        limit: 1,
    };
    
    if (state) {
        state.values = params;
        state.valids = result;
    }
    
    /**
     * 生成完整的 SQL 语句
     * 
     * 从 schema 内部获取表名和 JOIN 信息，无需外部参数
     * 字段引用规则由 config.quoteType 配置决定
     * 
     * @returns 完整的 SQL 语句
     * 
     * @example
     * // MariaDB/MySQL 默认格式（反引号）
     * SELECT `user`.`id`, `user`.`name`, `dept`.`name` AS `dept__name`
     * FROM `users` AS `user`
     * INNER JOIN `departments` AS `dept` ON `dept`.`id` = `user`.`dept_id`
     * WHERE `user`.`name` = ?
     * ORDER BY `user`.`age` ASC
     * 
     * @example
     * // ANSI_QUOTES 格式（双引号）
     * SELECT "user"."id", "user"."name"
     * FROM "users" AS "user"
     * 
     * @example
     * // SQL Server 格式（方括号）
     * SELECT [user].[id], [user].[name]
     * FROM [users] AS [user]
     */
    result.getSql = function (): string {
        const sqlParts: string[] = [];
        
        sqlParts.push(`SELECT ${buildSelect()}`);
        
        const rootTable = getRootTable();
        if (rootTable) {
            sqlParts.push(`FROM ${quote(rootTable.tableName)} AS ${quote(rootTable.nameAs)}`);
        }
        
        const joinTables = getJoinTables();
        for (const joinTable of joinTables) {
            const joinType = joinTable.joinType || 'INNER';
            // 使用配置的分隔符替换点，与字段路径格式保持一致
            const joinAlias = joinTable.fullPath.replace(/\./g, _levelSep);
            // joinOn 由使用者在 schema 中手动定义，根据数据库类型自行处理字段引用
            sqlParts.push(`${joinType} JOIN ${quote(joinTable.tableName)} AS ${quote(joinAlias)} ON ${joinTable.joinOn}`);
        }
        
        if (this.where) {
            sqlParts.push(`WHERE ${this.where}`);
        }
        
        if (this.order) {
            sqlParts.push(`ORDER BY ${this.order}`);
        }
        
        return sqlParts.join(' ');
    };
    
    /**
     * 获取所有参数的合并数组
     * @returns 按顺序排列的所有参数
     */
    result.getParams = function (): any[] {
        return [...this.selectParams, ...this.whereParams, ...this.orderParams];
    };
    
    const errors: Record<string, VError> = {};
    
    const operatorMap: Record<string, string> = {
        '$eq': '=',
        '$ne': '!=',
        '$lt': '<',
        '$lte': '<=',
        '$gt': '>',
        '$gte': '>=',
    };
    
    /**
     * 表信息映射表
     * key: 路径（如 '__root__' 或 'group' 或 'group.company'）
     * value: TableInfo 对象
     */
    const tables: Map<string, TableInfo> = new Map();
    
    /**
     * 字段信息映射表
     * key: 字段路径（支持两种格式：'name' 或 'group.name' 或 'group__name'）
     * value: FieldInfo 对象
     */
    const fields: Map<string, FieldInfo> = new Map();
    
    /**
     * 递归解析 schema 结构，提取表信息和字段信息
     * 
     * 核心逻辑：
     * 1. 解析当前层级的 tableName 和 nameAs，存入 tables 映射
     * 2. 遍历 properties，对于嵌套对象递归调用，对于普通字段存入 fields 映射
     * 3. 字段支持两种访问格式：
     *    - 点分隔格式：'group.name'
     *    - 双下划线格式：'group__name'（用于 cols 和 sort）
     * 
     * @param schemaNode - 当前层级的 schema 节点
     * @param parentPath - 父级路径，用于构建嵌套路径
     * @param parentTableAlias - 父级表别名
     */
    const parseSchema = (schemaNode: any, parentPath: string = '', parentTableAlias: string = '') => {
        if (!schemaNode || !schemaNode.properties) return;
        
        const tableName = schemaNode.tableName;
        const nameAs = schemaNode.nameAs || tableName;
        
        if (tableName && !tables.has(parentPath || '__root__')) {
            tables.set(parentPath || '__root__', {
                tableName,
                nameAs,
                joinOn: schemaNode.joinOn,
                joinType: schemaNode.joinType,
                parentPath: parentPath.substring(0, parentPath.lastIndexOf('.')) || '',
                fullPath: parentPath
            });
        }
        
        // 使用配置的分隔符替换点，与字段路径格式保持一致
        const currentTableAlias = parentPath ? parentPath.replace(/\./g, _levelSep) : nameAs;
        
        for (const [key, prop] of Object.entries(schemaNode.properties) as [string, any][]) {
            const currentPath = parentPath ? `${parentPath}.${key}` : key;
            
            if (prop.type === 'object' && prop.properties) {
                parseSchema(prop, currentPath, currentTableAlias);
            } else {
                const fullPathWithSep = parentPath ? `${parentPath.replace(/\./g, _levelSep)}${_levelSep}${key}` : key;
                
                fields.set(fullPathWithSep, {
                    tableAlias: currentTableAlias,
                    fieldName: key,
                    fullPath: currentPath,
                    findable: prop.findable === true,
                    sortable: prop.sortable === true
                });
            }
        }
    };
    
    parseSchema(schema);
    
    /**
     * 获取根表信息
     * 根表是 schema 顶层定义的主表
     */
    const getRootTable = (): TableInfo | undefined => {
        return tables.get('__root__');
    };
    
    /**
     * 获取所有关联表信息
     * 排除根表，返回所有需要 JOIN 的表
     */
    const getJoinTables = (): TableInfo[] => {
        const result: TableInfo[] = [];
        for (const [key, info] of tables) {
            if (key !== '__root__') {
                result.push(info);
            }
        }
        return result;
    };
    
    /**
     * 解析字段路径，返回字段信息
     * 
     * 只支持配置的分隔符格式：
     * - 简单字段名：'name' -> 查找 fields 映射
     * - 层级字段名：'group__name'（使用 __ 分隔符）或 'group.name'（使用 . 分隔符）
     * 
     * @param fieldPath - 字段路径
     * @returns FieldInfo 或 null
     */
    const parseFieldPath = (fieldPath: string): FieldInfo | null => {
        return fields.get(fieldPath) || null;
    };
    
    /**
     * 将 MongoDB 查询条件转换为 SQL WHERE 子句
     * 
     * 支持的操作符：
     * - 比较操作符：$eq, $ne, $lt, $lte, $gt, $gte
     * - 逻辑操作符：$and, $or
     * - 数组操作符：$in, $nin
     * - 其他操作符：$exists, $regex
     * 
     * 支持的字段格式：
     * - 简单字段：{ name: '张三' }
     * - 双下划线格式：{ group__name: '技术部' }
     * - 嵌套对象格式：{ group: { name: '技术部' } }
     * 
     * @param query - MongoDB 风格的查询条件
     * @param parentPath - 父级路径，用于处理嵌套对象
     * @returns { sql: WHERE 子句, params: 参数数组, usedTables: 使用的表别名集合 }
     */
    const buildWhere = (query: any, parentPath: string = ''): { sql: string; params: any[]; usedTables: Set<string> } => {
        if (!query || typeof query !== 'object') {
            return { sql: '', params: [], usedTables: new Set() };
        }
        
        const sqlParts: string[] = [];
        const params: any[] = [];
        const usedTables: Set<string> = new Set();
        
        for (const [key, val] of Object.entries(query)) {
            const currentPath = parentPath ? `${parentPath}${_levelSep}${key}` : key;
            
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
                            validConditions.forEach(c => c.usedTables.forEach(t => usedTables.add(t)));
                        }
                        break;
                    }
                    case '$in': {
                        const field = parentPath;
                        const fieldInfo = parseFieldPath(field);
                        if (!fieldInfo || !fieldInfo.findable) {
                            errors[field] = new VError('findable');
                            if (config.pickyMode) throw new VError('invalidSqls', undefined, errors);
                            continue;
                        }
                        usedTables.add(fieldInfo.tableAlias);
                        if (Array.isArray(val) && val.length > 0) {
                            params.push(...val);
                            sqlParts.push(`${quoteField(fieldInfo.tableAlias, fieldInfo.fieldName)} IN (${val.map(() => '?').join(', ')})`);
                        }
                        break;
                    }
                    case '$nin': {
                        const field = parentPath;
                        const fieldInfo = parseFieldPath(field);
                        if (!fieldInfo || !fieldInfo.findable) {
                            errors[field] = new VError('findable');
                            if (config.pickyMode) throw new VError('invalidSqls', undefined, errors);
                            continue;
                        }
                        usedTables.add(fieldInfo.tableAlias);
                        if (Array.isArray(val) && val.length > 0) {
                            params.push(...val);
                            sqlParts.push(`${quoteField(fieldInfo.tableAlias, fieldInfo.fieldName)} NOT IN (${val.map(() => '?').join(', ')})`);
                        }
                        break;
                    }
                    case '$exists': {
                        const field = parentPath;
                        const fieldInfo = parseFieldPath(field);
                        if (!fieldInfo || !fieldInfo.findable) {
                            errors[field] = new VError('findable');
                            if (config.pickyMode) throw new VError('invalidSqls', undefined, errors);
                            continue;
                        }
                        usedTables.add(fieldInfo.tableAlias);
                        sqlParts.push(val 
                            ? `${quoteField(fieldInfo.tableAlias, fieldInfo.fieldName)} IS NOT NULL`
                            : `${quoteField(fieldInfo.tableAlias, fieldInfo.fieldName)} IS NULL`);
                        break;
                    }
                    case '$regex': {
                        const field = parentPath;
                        const fieldInfo = parseFieldPath(field);
                        if (!fieldInfo || !fieldInfo.findable) {
                            errors[field] = new VError('findable');
                            if (config.pickyMode) throw new VError('invalidSqls', undefined, errors);
                            continue;
                        }
                        usedTables.add(fieldInfo.tableAlias);
                        params.push(val);
                        sqlParts.push(`${quoteField(fieldInfo.tableAlias, fieldInfo.fieldName)} REGEXP ?`);
                        break;
                    }
                    default: {
                        const sqlOp = operatorMap[key];
                        if (sqlOp) {
                            const field = parentPath;
                            const fieldInfo = parseFieldPath(field);
                            if (!fieldInfo || !fieldInfo.findable) {
                                errors[field] = new VError('findable');
                                if (config.pickyMode) throw new VError('invalidSqls', undefined, errors);
                                continue;
                            }
                            usedTables.add(fieldInfo.tableAlias);
                            params.push(val);
                            sqlParts.push(`${quoteField(fieldInfo.tableAlias, fieldInfo.fieldName)} ${sqlOp} ?`);
                        } else {
                            errors[key] = new VError('unsupportedSymbol', { value: key });
                            if (config.pickyMode) throw new VError('invalidSqls', undefined, errors);
                        }
                    }
                }
            } else {
                if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                    const nested = buildWhere(val, currentPath);
                    if (nested.sql) {
                        sqlParts.push(nested.sql);
                        params.push(...nested.params);
                        nested.usedTables.forEach(t => usedTables.add(t));
                    }
                } else {
                    const fieldInfo = parseFieldPath(currentPath);
                    if (!fieldInfo || !fieldInfo.findable) {
                        errors[currentPath] = new VError('findable');
                        if (config.pickyMode) throw new VError('invalidSqls', undefined, errors);
                        continue;
                    }
                    usedTables.add(fieldInfo.tableAlias);
                    params.push(val);
                    sqlParts.push(`${quoteField(fieldInfo.tableAlias, fieldInfo.fieldName)} = ?`);
                }
            }
        }
        
        return { sql: sqlParts.join(' AND '), params, usedTables };
    };
    
    /**
     * 转换为 SQL ORDER BY 子句
     * 
     * 1. MongoDB 标准对象格式（推荐）：{ col1: 1, col2: -1 }
     *    - 1 表示升序
     *    - -1 表示降序
     *    - 输出保持对象格式
     * 
     * 2. 数组字符串格式（规避 JSON 对象可能无法保障顺序）：
     *    - '-'前缀逆序：['col1', '-col2']（col2 降序）
     *    - '!'后缀逆序：['col1', 'col2!']（col2 降序）
     * 
     * 支持双下划线格式的字段名：{ 'group__boost': -1 } 或 ['-group__boost'] 或 ['group__boost!']
     * 
     * @param sort - 排序参数，可以是对象或数组
     * @returns { sql: ORDER BY 子句, usedTables: 使用的表别名集合 }
     */
    const buildOrder = (sort: any): { sql: string; usedTables: Set<string> } => {
        if (!sort || typeof sort !== 'object') {
            return { sql: '', usedTables: new Set() };
        }
        
        const orderParts: string[] = [];
        const usedTables: Set<string> = new Set();
        
        if (Array.isArray(sort)) {
            for (const item of sort) {
                if (typeof item !== 'string') continue;
                
                let fieldName = item;
                let direction = 'ASC';
                
                if (item.endsWith('!')) {
                    fieldName = item.slice(0, -1);
                    direction = 'DESC';
                } else if (item.startsWith('-')) {
                    fieldName = item.slice(1);
                    direction = 'DESC';
                }
                
                const fieldInfo = parseFieldPath(fieldName);
                if (!fieldInfo || !fieldInfo.sortable) {
                    errors[fieldName] = new VError('sortable');
                    if (config.pickyMode) throw new VError('invalidSqls', undefined, errors);
                    continue;
                }
                usedTables.add(fieldInfo.tableAlias);
                orderParts.push(`${quoteField(fieldInfo.tableAlias, fieldInfo.fieldName)} ${direction}`);
            }
        } else {
            for (const [key, order] of Object.entries(sort)) {
                const fieldInfo = parseFieldPath(key);
                if (!fieldInfo || !fieldInfo.sortable) {
                    errors[key] = new VError('sortable');
                    if (config.pickyMode) throw new VError('invalidSqls', undefined, errors);
                    continue;
                }
                usedTables.add(fieldInfo.tableAlias);
                const direction = order === -1 ? 'DESC' : 'ASC';
                orderParts.push(`${quoteField(fieldInfo.tableAlias, fieldInfo.fieldName)} ${direction}`);
            }
        }
        
        return { sql: orderParts.join(', '), usedTables };
    };
    
    /**
     * 解构参数，分离查询条件、排序、分页和返回字段
     * 
     * 如果指定了 findKey，则使用 findKey 对应的值作为查询条件
     * 否则，除 sort/skip/limit/cols 外的其他字段都作为查询条件
     */
    let findData: any, sortData: any, skipData: any, limitData: any, colsData: any;
    if (findKey !== undefined) {
        ({ [_sortKey]: sortData, [_skipKey]: skipData, [_limitKey]: limitData, [_colsKey]: colsData, [findKey]: findData } = params);
    } else {
        ({ [_sortKey]: sortData, [_skipKey]: skipData, [_limitKey]: limitData, [_colsKey]: colsData, ...findData } = params);
    }
    
    const whereResult = buildWhere(findData);
    const orderResult = buildOrder(sortData);
    
    result.where = whereResult.sql;
    result.whereParams = whereResult.params;
    result.order = orderResult.sql;
    result.usedTables = new Set([...whereResult.usedTables, ...orderResult.usedTables]);
    
    result.skip  = skipData  !== undefined ? (typeof skipData  === 'number' ? skipData  : parseInt(skipData , 10)) : 0;
    result.limit = limitData !== undefined ? (typeof limitData === 'number' ? limitData : parseInt(limitData, 10)) : 1;
    
    /**
     * 处理返回字段 cols
     * 
     * 支持三种格式：
     * 1. 数组格式：['name', 'age', 'group__name']
     * 2. MongoDB 投影格式：{ name: 1, age: 1 } 或 { phone: 0 }
     *    - 1/true: 包含字段
     *    - 0/false: 排除字段
     * 3. 未指定：返回所有顶层字段
     * 
     * 安全特性：只允许 schema 中配置的字段进入 SELECT 子句
     * 未配置的字段会被自动过滤，防止 SQL 注入
     * 
     * 双下划线格式的字段会自动生成 AS 别名
     */
    if (Array.isArray(colsData)) {
        result.cols = colsData.filter(col => parseFieldPath(col));
    } else if (colsData && typeof colsData === 'object') {
        const colsArray: string[] = [];
        const excludeCols: string[] = [];
        let hasInclude = false;
        
        for (const [key, val] of Object.entries(colsData)) {
            if (val === 1 || val === true) {
                colsArray.push(key);
                hasInclude = true;
            } else if (val === 0 || val === false) {
                excludeCols.push(key);
            }
        }
        
        result.cols = hasInclude ? colsArray : Array.from(fields.keys()).filter(f => !excludeCols.includes(f) && !f.includes('.'));
    } else {
        result.cols = Array.from(fields.keys()).filter(f => !f.includes('.'));
    }
    
    /**
     * 构建 SELECT 子句
     * 
     * 当字段名与别名相同时不添加 AS 子句，否则添加 AS 别名
     * 例如：`user`.`id`, `group`.`name` AS `group__name`（使用 __ 分隔符）
     * 或：`user`.`id`, `group`.`name` AS `group.name`（使用 . 分隔符）
     * 
     * 规则：
     * - 普通字段（无层级分隔符）：字段名与别名相同，不添加 AS
     * - 关联表字段（含层级分隔符）：字段名与别名不同，添加 AS 别名
     */
    const buildSelect = (): string => {
        const selectParts: string[] = [];
        
        for (const col of result.cols) {
            const fieldInfo = parseFieldPath(col);
            if (fieldInfo) {
                const selectField = quoteField(fieldInfo.tableAlias, fieldInfo.fieldName);
                // 当字段名与别名相同时不添加 AS 子句
                if (col.includes(_levelSep)) {
                    selectParts.push(`${selectField} AS ${quote(col)}`);
                } else {
                    selectParts.push(selectField);
                }
            }
        }
        
        return selectParts.length > 0 ? selectParts.join(', ') : '*';
    };
    
    result.select = buildSelect();
    
    if (Object.keys(errors).length > 0 && !config.ignoreErrors) {
        throw new VError('invalidSqls', undefined, errors);
    }
    
    return result;
}
