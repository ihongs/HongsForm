import { VState, VError } from './types.js';

// 表信息接口
interface TableInfo {
    tableName: string;
    nameAs: string;
    joinOn?: string;
    joinType?: string;
    fullPath: string;
}

// 操作符映射表
const operatorMap: Record<string, string> = {
    '$eq': '=',
    '$ne': '!=',
    '$lt': '<',
    '$lte': '<=',
    '$gt': '>',
    '$gte': '>=',
};

// 字段引用映射
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
 *       nameAs: 'group',
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
        select: '',
        order: '',
        where: '',
        whereParams: [],
        skip : 0,
        limit: 1,
    };
    
    if (state) {
        state.values = params;
        state.valids = result;
    }
    
    const errors: Record<string, VError> = {};
    
    const setError = (top: string, key: string, err: string, params?: Record<string, unknown>): void => {
        if (!top) {
            errors[key] = new VError(err, params);
        } else {
            if (!errors[top]) errors[top] = new VError(top);
            if (!errors[top].errors) errors[top].errors = {};
            errors[top].errors[key] = new VError(err, params);
        }
        if (config.pickyMode) throw new VError('invalidSqls', undefined, errors);
    }
    
    /**
     * 生成完整的 SQL 语句
     * 
     * 从 schema 内部获取表名和 JOIN 信息，无需外部参数
     * 字段引用规则由 config.quoteType 配置决定
     * 
     * @returns 完整的 SQL 语句
     */
    result.getSql = function (): string {
        const sqlParts: string[] = [];
        
        sqlParts.push(`SELECT ${this.select}`);
        
        const rootTable = getTableInfo(schema);
        if (rootTable) {
            sqlParts.push(`FROM ${quote(rootTable.tableName)} AS ${quote(rootTable.nameAs)}`);
        }
        
        const joinTables = getJoinTables(schema);
        for (const joinTable of joinTables) {
            const joinType = joinTable.joinType || 'INNER';
            const joinAlias = joinTable.fullPath.replace(/\./g, _levelSep);
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
        return this.whereParams;
    };
    
    /**
     * 根据字段路径查找子 schema 和字段名
     * 支持配置的分隔符（`.` 或 `__`）
     * 
     * @param fieldPath - 字段路径，如 'group.name' 或 'group__name'
     * @returns [子 schema, 字段名]
     */
    const findChildSchema = (fieldPath: string): [any, string] => {
        let childSchema = schema;
        const parts = fieldPath.split(_levelSep);
        const fieldName = parts[parts.length - 1];
        
        for (let i = 0; i < parts.length - 1; i++) {
            const key = parts[i];
            if (childSchema.properties && childSchema.properties[key]) {
                if (childSchema.properties[key].type === 'object') {
                    childSchema = childSchema.properties[key];
                    continue;
                }
                if (childSchema.properties[key].type === 'array' && childSchema.properties[key].items?.type === 'object') {
                    childSchema = childSchema.properties[key];
                    continue;
                }
            }
            childSchema = null;
            break;
        }
        return [childSchema, fieldName];
    };

    /**
     * 检查字段路径是否可查询
     * 支持两种配置方式：
     * 1. properties: { field: { findable: true } }
     * 2. findable: ['field1', 'field2']（字段不必在 properties 中定义）
     * 
     * @param fieldPath - 字段路径
     * @returns 字段是否可查询
     */
    const isFindable = (fieldPath: string): boolean => {
        const [childSchema, fieldName] = findChildSchema(fieldPath);
        if (childSchema) {
            if (childSchema.properties?.[fieldName]?.findable === true) {
                return true;
            }
            if (childSchema.items?.properties?.[fieldName]?.findable === true) {
                return true;
            }
            if (Array.isArray(childSchema.findable) && childSchema.findable.includes(fieldName)) {
                return true;
            }
        }
        return false;
    };

    /**
     * 检查字段路径是否可排序
     * 支持两种配置方式：
     * 1. properties: { field: { sortable: true } }
     * 2. sortable: ['field1', 'field2']（字段不必在 properties 中定义）
     * 
     * @param fieldPath - 字段路径
     * @returns 字段是否可排序
     */
    const isSortable = (fieldPath: string): boolean => {
        const [childSchema, fieldName] = findChildSchema(fieldPath);
        if (childSchema) {
            if (childSchema.properties?.[fieldName]?.sortable === true) {
                return true;
            }
            if (childSchema.items?.properties?.[fieldName]?.sortable === true) {
                return true;
            }
            if (Array.isArray(childSchema.sortable) && childSchema.sortable.includes(fieldName)) {
                return true;
            }
        }
        return false;
    };

    /**
     * 检查字段是否存在于 schema 中（用于 cols）
     * 只要字段在 properties 中定义，或者父级有 findable/sortable 数组包含它，就认为存在
     */
    const isListable = (fieldPath: string): boolean => {
        // 直接检查所有字段里有没有这个字段
        return getAllFields(schema).includes(fieldPath);
        /*
        const [childSchema, fieldName] = findChildSchema(fieldPath);
        if (!childSchema) return false;
        
        // 检查 properties 中是否定义了该字段（不管是否有 findable/sortable）
        if (childSchema.properties?.[fieldName]) return true;
        if (childSchema.items?.properties?.[fieldName]) return true;
        
        // 检查父级的 listable/findable/sortable 数组
        if (Array.isArray(childSchema.listable) && childSchema.listable.includes(fieldName)) return true;
        if (Array.isArray(childSchema.findable) && childSchema.findable.includes(fieldName)) return true;
        if (Array.isArray(childSchema.sortable) && childSchema.sortable.includes(fieldName)) return true;
        
        return false;
        */
    };

    /**
     * 获取 schema 中所有字段
     * 直接获取全部，避免重复调用
     */
    let allFields: string[] | null = null;
    const getAllFields = (schemaNode: any, parentPath: string = ''): string[] => {
        if (allFields) return allFields;

        const fields: string[] = [];
        if (!schemaNode || !schemaNode.properties) return fields;
        
        for (const [key, prop] of Object.entries(schemaNode.properties) as [string, any][]) {
            const currentPath = parentPath ? `${parentPath}${_levelSep}${key}` : key;
            
            if (prop.type === 'object') {
                fields.push(...getAllFields(prop, currentPath));
                
                if (prop.findable === true || prop.sortable === true) {
                    fields.push(currentPath);
                }
                if (Array.isArray(prop.findable) || Array.isArray(prop.sortable)) {
                    fields.push(currentPath);
                }
            } else if (prop.type === 'array' && prop.items?.type === 'object') {
                fields.push(...getAllFields(prop.items, currentPath));
            } else {
                if (prop.findable === true || prop.sortable === true) {
                    fields.push(currentPath);
                }
            }
            
            if (Array.isArray(schemaNode.listable) && schemaNode.listable.includes(key)) {
                fields.push(currentPath);
            }
            if (Array.isArray(schemaNode.findable) && schemaNode.findable.includes(key)) {
                fields.push(currentPath);
            }
            if (Array.isArray(schemaNode.sortable) && schemaNode.sortable.includes(key)) {
                fields.push(currentPath);
            }
        }

        allFields = fields;
        
        return fields;
    };
    getAllFields(schema);

    /**
     * 获取字段的表别名
     * 
     * @param fieldPath - 字段路径
     * @returns 表别名，如果找不到返回 null
     */
    const getFieldTableAlias = (fieldPath: string): string | null => {
        // 直接从路径拆表名就行了，调这个之前已经调过 isFindable/isSortable 
        const pos = fieldPath.lastIndexOf(_levelSep);
        if (pos !== -1) {
            return fieldPath.substring( 0, pos );
        }
        return schema.nameAs || schema.tableName;
        /*
        const parts = fieldPath.split(_levelSep);
        let currentSchema = schema;
        let tableAlias = schema.nameAs || schema.tableName;
        
        for (let i = 0; i < parts.length - 1; i++) {
            const key = parts[i];
            if (currentSchema.properties && currentSchema.properties[key]) {
                const prop = currentSchema.properties[key];
                const currentPath = parts.slice(0, i + 1).join(_levelSep);
                
                if (prop.type === 'object') {
                    currentSchema = prop;
                    if (prop.nameAs) {
                        tableAlias = prop.nameAs;
                    } else {
                        tableAlias = currentPath;
                    }
                    continue;
                }
                if (prop.type === 'array' && prop.items?.type === 'object') {
                    currentSchema = prop.items;
                    if (prop.items.nameAs) {
                        tableAlias = prop.items.nameAs;
                    } else {
                        tableAlias = currentPath;
                    }
                    continue;
                }
            }
            return null;
        }
        return tableAlias;
        */
    };

    /**
     * 获取根表信息
     */
    const getTableInfo = (schemaNode: any): TableInfo | undefined => {
        if (schemaNode.tableName) {
            return {
                tableName: schemaNode.tableName,
                nameAs: schemaNode.nameAs || schemaNode.tableName,
                joinOn: schemaNode.joinOn,
                joinType: schemaNode.joinType,
                fullPath: ''
            };
        }
        return undefined;
    };

    /**
     * 获取所有关联表信息
     */
    const getJoinTables = (schemaNode: any, parentPath: string = ''): TableInfo[] => {
        const result: TableInfo[] = [];
        if (!schemaNode || !schemaNode.properties) return result;
        
        for (const [key, prop] of Object.entries(schemaNode.properties) as [string, any][]) {
            const currentPath = parentPath ? `${parentPath}.${key}` : key;
            
            if (prop.type === 'object' && prop.tableName) {
                result.push({
                    tableName: prop.tableName,
                    nameAs: prop.nameAs || prop.tableName,
                    joinOn: prop.joinOn,
                    joinType: prop.joinType,
                    fullPath: currentPath
                });
                
                result.push(...getJoinTables(prop, currentPath));
            } else if (prop.type === 'array' && prop.items?.type === 'object' && prop.items?.tableName) {
                result.push({
                    tableName: prop.items.tableName,
                    nameAs: prop.items.nameAs || prop.items.tableName,
                    joinOn: prop.items.joinOn,
                    joinType: prop.items.joinType,
                    fullPath: currentPath
                });
                
                result.push(...getJoinTables(prop.items, currentPath));
            }
        }
        
        return result;
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
                        if (!isFindable(field)) {
                            setError(findKey, field, 'findable');
                            continue;
                        }
                        const tableAlias = getFieldTableAlias(field);
                        if (!tableAlias) {
                            setError(findKey, field, 'findable');
                            continue;
                        }
                        usedTables.add(tableAlias);
                        if (Array.isArray(val) && val.length > 0) {
                            params.push(...val);
                            sqlParts.push(`${quoteField(tableAlias, field.split(_levelSep).pop()!)} IN (${val.map(() => '?').join(', ')})`);
                        }
                        break;
                    }
                    case '$nin': {
                        const field = parentPath;
                        if (!isFindable(field)) {
                            setError(findKey, field, 'findable');
                            continue;
                        }
                        const tableAlias = getFieldTableAlias(field);
                        if (!tableAlias) {
                            setError(findKey, field, 'findable');
                            continue;
                        }
                        usedTables.add(tableAlias);
                        if (Array.isArray(val) && val.length > 0) {
                            params.push(...val);
                            sqlParts.push(`${quoteField(tableAlias, field.split(_levelSep).pop()!)} NOT IN (${val.map(() => '?').join(', ')})`);
                        }
                        break;
                    }
                    case '$exists': {
                        const field = parentPath;
                        if (!isFindable(field)) {
                            setError(findKey, field, 'findable');
                            continue;
                        }
                        const tableAlias = getFieldTableAlias(field);
                        if (!tableAlias) {
                            setError(findKey, field, 'findable');
                            continue;
                        }
                        usedTables.add(tableAlias);
                        sqlParts.push(val 
                            ? `${quoteField(tableAlias, field.split(_levelSep).pop()!)} IS NOT NULL`
                            : `${quoteField(tableAlias, field.split(_levelSep).pop()!)} IS NULL`);
                        break;
                    }
                    case '$regex': {
                        const field = parentPath;
                        if (!isFindable(field)) {
                            setError(findKey, field, 'findable');
                            continue;
                        }
                        const tableAlias = getFieldTableAlias(field);
                        if (!tableAlias) {
                            setError(findKey, field, 'findable');
                            continue;
                        }
                        usedTables.add(tableAlias);
                        params.push(val);
                        sqlParts.push(`${quoteField(tableAlias, field.split(_levelSep).pop()!)} REGEXP ?`);
                        break;
                    }
                    default: {
                        const sqlOp = operatorMap[key];
                        if (sqlOp) {
                            const field = parentPath;
                            if (!isFindable(field)) {
                                setError(findKey, field, 'findable');
                                continue;
                            }
                            const tableAlias = getFieldTableAlias(field);
                            if (!tableAlias) {
                                setError(findKey, field, 'findable');
                                continue;
                            }
                            usedTables.add(tableAlias);
                            params.push(val);
                            sqlParts.push(`${quoteField(tableAlias, field.split(_levelSep).pop()!)} ${sqlOp} ?`);
                        } else {
                            setError(findKey, parentPath, 'unsupportedSymbol', { value: key });
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
                    if (!isFindable(currentPath)) {
                        setError(findKey, currentPath, 'findable');
                        continue;
                    }
                    const tableAlias = getFieldTableAlias(currentPath);
                    if (!tableAlias) {
                        setError(findKey, currentPath, 'findable');
                        continue;
                    }
                    usedTables.add(tableAlias);
                    params.push(val);
                    sqlParts.push(`${quoteField(tableAlias, currentPath.split(_levelSep).pop()!)} = ?`);
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
                
                if (!isSortable(fieldName)) {
                    setError(_sortKey, fieldName, 'sortable');
                    continue;
                }
                const tableAlias = getFieldTableAlias(fieldName);
                if (!tableAlias) {
                    setError(_sortKey, fieldName, 'sortable');
                    continue;
                }
                usedTables.add(tableAlias);
                orderParts.push(`${quoteField(tableAlias, fieldName.split(_levelSep).pop()!)} ${direction}`);
            }
        } else {
            for (const [key, order] of Object.entries(sort)) {
                if (!isSortable(key)) {
                    setError(_sortKey, key, 'sortable');
                    continue;
                }
                const tableAlias = getFieldTableAlias(key);
                if (!tableAlias) {
                    setError(_sortKey, key, 'sortable');
                    continue;
                }
                usedTables.add(tableAlias);
                const direction = order === -1 ? 'DESC' : 'ASC';
                orderParts.push(`${quoteField(tableAlias, key.split(_levelSep).pop()!)} ${direction}`);
            }
        }
        
        return { sql: orderParts.join(', '), usedTables };
    };
    
    /**
     * 构建 SELECT 子句
     * 
     * 支持两种输入格式：
     * - 对象格式：{ field1: 1, field2: 0 }，1 表示包含，0 表示排除
     * - 数组格式：['field1', 'field2']，支持 -前缀 和 !后缀 表示排除
     *   例如：['field1', '-field2', 'field3!'] 表示包含 field1，排除 field2 和 field3
     * 
     * 双下划线格式的字段会自动生成 AS 别名
     * 
     * 当字段名与别名相同时不添加 AS 子句，否则添加 AS 别名
     * 例如：`user`.`id`, `group`.`name` AS `group__name`（使用 __ 分隔符）
     * 或：`user`.`id`, `group`.`name` AS `group.name`（使用 . 分隔符）
     * 
     * 规则：
     * - 普通字段（无层级分隔符）：字段名与别名相同，不添加 AS
     * - 关联表字段（含层级分隔符）：字段名与别名不同，添加 AS 别名
     */
    const buildSelect = (colsData: any): { sql: string; usedTables: Set<string> } => {
        let includeCols: string[] = [];
        let excludeCols: string[] = [];
        
        // 统一转为对象模式处理
        if (Array.isArray(colsData)) {
            for (const item of colsData) {
                if (typeof item !== 'string') continue;
                
                let key = item;
                let exclude = false;
                
                if (item.startsWith('-')) {
                    key = item.slice(1);
                    exclude = true;
                } else if (item.endsWith('!')) {
                    key = item.slice(0, -1);
                    exclude = true;
                }
                
                if (!isListable(key)) {
                    setError(_colsKey, key, 'listable');
                    continue;
                }
                
                if (exclude) {
                    excludeCols.push(key);
                } else {
                    includeCols.push(key);
                }
            }
        } else if (colsData && typeof colsData === 'object') {
            for (const [key, val] of Object.entries(colsData)) {
                if (val === 1 || val === true) {
                    if (isListable(key)) {
                        includeCols.push(key);
                    } else {
                        setError(_colsKey, key, 'listable');
                    }
                } else if (val === 0 || val === false) {
                    excludeCols.push(key);
                }
            }
        }
        
        // 根据包含/排除确定最终字段列表
        let cols: string[];
        if (includeCols.length > 0) {
            cols = includeCols;
        } else {
            const allFields = getAllFields(schema);
            cols = allFields.filter(f => !excludeCols.includes(f) && !f.includes(_levelSep));
        }

        const selectParts: string[] = [];
        const usedTables = new Set<string>();
        
        for (const col of cols) {
            if (!isListable(col)) continue;
            
            const tableAlias = getFieldTableAlias(col);
            if (!tableAlias) continue;
            usedTables.add(tableAlias);
            
            const fieldName = col.split(_levelSep).pop()!;
            const selectField = quoteField(tableAlias, fieldName);
            
            if (col.includes(_levelSep)) {
                selectParts.push(`${selectField} AS ${quote(col)}`);
            } else {
                selectParts.push(selectField);
            }
        }
        
        return { sql: selectParts.length > 0 ? selectParts.join(', ') : '*', usedTables };
    };
    
    // 解构参数，分离 find、sort、skip、limit、cols
    let findData: any, sortData: any, skipData: any, limitData: any, colsData: any;
    if (findKey !== undefined) {
        ({ [_sortKey]: sortData, [_skipKey]: skipData, [_limitKey]: limitData, [_colsKey]: colsData, [findKey]: findData } = params);
    } else {
        ({ [_sortKey]: sortData, [_skipKey]: skipData, [_limitKey]: limitData, [_colsKey]: colsData, ...findData } = params);
    }
    
    const  whereResult = buildWhere (findData);
    const  orderResult = buildOrder (sortData);
    const selectResult = buildSelect(colsData);

    result.where  =  whereResult.sql;
    result.whereParams = whereResult.params;
    result.order  =  orderResult.sql;
    result.select = selectResult.sql;

    result.usedTables = new Set([...whereResult.usedTables, ...orderResult.usedTables, ...selectResult.usedTables]);
    
    result.skip  = skipData  !== undefined ? (typeof skipData  === 'number' ? skipData  : parseInt(skipData , 10)) : 0;
    result.limit = limitData !== undefined ? (typeof limitData === 'number' ? limitData : parseInt(limitData, 10)) : 1;
    
    if (Object.keys(errors).length > 0 && !config.ignoreErrors) {
        throw new VError('invalidSqls', undefined, errors);
    }
    
    return result;
}