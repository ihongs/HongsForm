import { VState, VError } from './types.js';

/**
 * 支持的 MongoDB 操作符
 */
const supportedOperators = [
    // 比较操作符
    '$eq', '$ne', '$lt', '$lte', '$gt', '$gte',
    // 逻辑操作符
    '$or', '$and', '$nor', '$not',
    // 数组操作符
    '$in', '$nin', '$all', '$elemMatch', '$size',
    // 存在性操作符
    '$exists',
    // 正则操作符
    '$regex', '$options',
    // 文本搜索
    '$text', '$search', '$language', '$caseSensitive', '$diacriticSensitive',
    // 地理空间
    '$geoWithin', '$geoIntersects', '$near', '$nearSphere',
    // 位操作
    '$bitsAllSet', '$bitsAnySet', '$bitsAllClear', '$bitsAnyClear'
];

// 校验查询参数
// config.ignoreErrors: 忽略校验错误，默认 false
// config.findKey: 自定义查询参数键名，默认不设，从顶层开始
// config.colsKey: 自定义返回字段参数键名，默认 'cols'
// config.sortKey: 自定义排序字段参数键名，默认 'sort'
// config.skipKey: 自定义跳过行数参数键名，默认 'skip'
// config.limitKey: 自定义限定行数参数键名，默认 'limit'
export const validateFind = function (params: any, schema: any, config: any, state?: VState) {
    const properties = schema?.properties || {};
    let { findKey, colsKey, sortKey, skipKey, limitKey } = config || {};
    colsKey = colsKey || 'cols';
    sortKey = sortKey || 'sort';
    skipKey = skipKey || 'skip';
    limitKey = limitKey || 'limit';
    
    const result: any = {
        find: {},
        sort: [],
        skip: 0,
        limit: 1,
        cols: [],
    };
    
    if (state) {
        state.values = params;
        state.valids = result;
    }
    
    const errors: Record<string, VError> = {};
    
    /**
     *  {
     *      type: 'object',
     *      findable: ['field1', 'field2'], // 等效下方分开写
     *      properties: {
     *          field1: { findable: true }
     *          field2: { findable: true }
     *          subObj: { // subObj.abc 返回 [subObj, 'abc']
     *              type: 'object',
     *              findable: ['abc']
     *          },
     *          subArr: { // subArr.xyz 返回 [subArr, 'xyz']
     *              type: 'array',
     *              findable: ['xyz'],
     *              items: {
     *                  type: 'object'
     *              }
     *          }
     *      }
     *  }
     */
    const findChildSchema = (fieldPath: string): [any, string] => {
        let childSchema = schema;
        const parts = fieldPath.split('.');
        const fieldName = parts[parts.length - 1];
        for (let i = 0; i < parts.length - 1; i++) {
            const key = parts[i];
            if (childSchema.properties && childSchema.properties[key]) {
                // 子级对象
                if (childSchema.properties[key].type == 'object') {
                    childSchema = childSchema.properties[key];
                    continue;
                }
                // 子级数组对象
                if (childSchema.properties[key].type == 'array' && childSchema.properties[key].items?.type == 'object') {
                    childSchema = childSchema.properties[key];
                    continue;
                }
            }
            childSchema = null;
            break;
        }
        return [childSchema, fieldName];
    }

    /**
     * 检查字段路径是否在 schema 中可查询
     * 支持两种配置方式：
     * 1. properties: { field: { findable: true } }
     * 2. findable: ['field1', 'field2']（字段不必在 properties 中定义）
     */
    const isFindable = (fieldPath: string): boolean => {
        const [childSchema, fieldName] = findChildSchema(fieldPath);
        if (childSchema) {
            // 子级对象
            if (childSchema.properties?.[fieldName]?.findable === true) {
                return true;
            }
            // 子级数组对象
            if (childSchema.items?.properties?.[fieldName]?.findable === true) {
                return true;
            }
            // 上级 findable 数组
            if (Array.isArray(childSchema.findable) && childSchema.findable.includes(fieldName)) {
                return true;
            }
        }
        return false;
    };
    
    /**
     * 检查字段是否可排序
     * 支持两种配置方式：
     * 1. properties: { field: { sortable: true } }
     * 2. sortable: ['field1', 'field2']（字段不必在 properties 中定义）
     */
    const isSortable = (fieldPath: string): boolean => {
        const [childSchema, fieldName] = findChildSchema(fieldPath);
        if (childSchema) {
            // 子级对象
            if (childSchema.properties?.[fieldName]?.sortable === true) {
                return true;
            }
            // 子级数组对象
            if (childSchema.items?.properties?.[fieldName]?.sortable === true) {
                return true;
            }
            // 上级 sortable 数组
            if (Array.isArray(childSchema.sortable) && childSchema.sortable.includes(fieldName)) {
                return true;
            }
        }
        return false;
    };
    
    /**
     * 递归过滤查询字段
     */
    const filterFind = (value: any, parentPath: string = ''): any => {
        if (value === null || value === undefined) return undefined;
        if (Array.isArray(value)) {
            return value.map(item => filterFind(item, parentPath)).filter(Boolean);
        }
        if (typeof value !== 'object') return value;
        
        const result: any = {};
        for (const [key, val] of Object.entries(value)) {
            const currentPath = parentPath ? `${parentPath}.${key}` : key;
            
            // MongoDB 操作符
            if (key.startsWith('$')) {
                // 检查操作符是否支持
                if (!supportedOperators.includes(key)) {
                    errors[key] = new VError('unsupportedSymbol', {value: key});
                    if (config.pickyMode) {
                        throw new VError('invalidFind', undefined, errors);
                    }
                    continue;
                }
                
                if (Array.isArray(val)) {
                    // $or, $and, $nor 等 - 这些操作符内的数组元素应该是独立的查询条件
                    const filtered = val.map((item: any) => filterFind(item, '')).filter(Boolean);
                    if (filtered.length > 0) result[key] = filtered;
                } else if (typeof val === 'object' && val !== null) {
                    // $not 等 - 这些操作符内的对象应该继续递归处理
                    const filtered = filterFind(val, currentPath);
                    if (filtered && Object.keys(filtered).length > 0) result[key] = filtered;
                } else {
                    result[key] = val;
                }
            } else {
                // 普通字段
                if (isFindable(currentPath)) {
                    const filtered = filterFind(val, currentPath);
                    if (filtered !== undefined) result[key] = filtered;
                } else {
                    // 收集错误或立即抛出
                    errors[currentPath] = new VError('findable');
                    if (config.pickyMode) {
                        throw new VError('invalidFind', undefined, errors);
                    }
                }
            }
        }
        return Object.keys(result).length > 0 ? result : undefined;
    };
    
    /**
     * 过滤排序字段
     * 
     * 支持多种排序格式输入，统一输出为 MongoDB 标准对象格式：
     * 
     * 1. MongoDB 标准对象格式（推荐）：{ col1: 1, col2: -1 }
     *    - 1 表示升序
     *    - -1 表示降序
     *    - 输出保持对象格式
     * 
     * 2. 数组字符串格式（规避 JSON 对象可能无法保障顺序）：
     *    - '-'前缀逆序：['col1', '-col2']（col2 降序）
     *    - '!'后缀逆序：['col1', 'col2!']（col2 降序）
     *    - 统一转换为对象格式输出
     * 
     * @param value - 排序参数，可以是对象或字符串数组
     * @returns 标准 MongoDB 排序对象 { field1: 1, field2: -1 }
     */
    const filterSort = (value: any): any => {
        const result: any = {};
        
        if (!value || typeof value !== 'object') return result;
        
        if (Array.isArray(value)) {
            for (const item of value) {
                if (typeof item !== 'string') continue;
                
                let fieldName = item;
                let order = 1;
                
                if (item.startsWith('-')) {
                    fieldName = item.slice(1);
                    order = -1;
                } else if (item.endsWith('!')) {
                    fieldName = item.slice(0, -1);
                    order = -1;
                }
                
                if (isSortable(fieldName)) {
                    result[fieldName] = order;
                } else {
                    errors[fieldName] = new VError('sortable');
                    if (config.pickyMode) {
                        throw new VError('invalidFind', undefined, errors);
                    }
                }
            }
        } else {
            for (const [key, order] of Object.entries(value)) {
                if (isSortable(key) && (order === 1 || order === -1)) {
                    result[key] = order;
                } else if (!isSortable(key)) {
                    errors[key] = new VError('sortable');
                    if (config.pickyMode) {
                        throw new VError('invalidFind', undefined, errors);
                    }
                }
            }
        }
        
        return result;
    };

    // 处理返回字段 cols
    // cols 结构: MongoDB 标准投影对象 {field_name: 0|1}
    // 如没有值为 1 的字段，返回所有 properties 的字段名（对象格式）
    // 如果有值为 0 的字段，从字段列表中排除（对象格式）
    // 支持的值: 1/true (包含), 0/false (排除)
    const filterCols = (colsData: any) => {
        if (colsData && typeof colsData === 'object') {
            const colsObj: any = {};
            let hasInclude = false;
            let hasExclude = false;
            
            for (const [key, val] of Object.entries(colsData)) {
                if (val === 1 || val === true) {
                    colsObj[key] = 1;
                    hasInclude = true;
                } else if (val === 0 || val === false) {
                    colsObj[key] = 0;
                    hasExclude = true;
                }
            }
            
            if (hasInclude) {
                // 有明确的 include 字段，只返回 include 列表（MongoDB 标准格式）
                return colsObj;
            } else if (hasExclude) {
                // 只有 exclude 字段，返回排除列表（MongoDB 标准格式）
                return colsObj;
            } else {
                // 没有有效字段，返回空对象（表示返回所有字段）
                return {};
            }
        } else {
            // 没有指定 cols，返回空对象（MongoDB 中表示返回所有字段）
            return {};
        }
    }
    
    // 解构参数，分离 find、sort、skip、limit、cols
    let findData: any, sortData: any, skipData: any, limitData: any, colsData: any;
    if (findKey !== undefined) {
        ({ [sortKey]: sortData, [skipKey]: skipData, [limitKey]: limitData, [colsKey]: colsData, [findKey]: findData } = params);
    } else {
        ({ [sortKey]: sortData, [skipKey]: skipData, [limitKey]: limitData, [colsKey]: colsData, ...findData } = params);
    }
    
    // 处理查询
    result.find = findData !== undefined ? filterFind(findData) : {};
    
    // 处理排序
    result.sort = sortData !== undefined ? filterSort(sortData) : [];

    // 处理返回字段
    result.cols = colsData !== undefined ? filterCols(colsData) : {};
    
    // 处理 skip 和 limit
    result.skip  = skipData  !== undefined && typeof skipData  === 'number' && skipData  >= 0 ? skipData  : 0;
    result.limit = limitData !== undefined && typeof limitData === 'number' && limitData >= 1 ? limitData : 1;
    
    // 如果有错误且不是忽略错误模式，则抛出异常
    if (Object.keys(errors).length > 0 && !config.ignoreErrors) {
        throw new VError('invalidFind', undefined, errors);
    }

    return result;
};
