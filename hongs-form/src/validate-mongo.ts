import { VState, VError } from './types.js';

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
    
    const errors: Record<string, VError> = {};
    
    if (state) {
        state.values = params;
        state.valids = result;
    }
    
    /**
     * 检查字段路径是否在 schema 中可查询
     */
    const isFindable = (fieldPath: string): boolean => {
        if (properties[fieldPath]) {
            return (properties[fieldPath] as any).findable === true;
        }
        
        for (const [key, val] of Object.entries(properties)) {
            if (fieldPath === key || fieldPath.startsWith(key + '.')) {
                if ((val as any).findable === true) return true;
            }
        }
        return false;
    };
    
    /**
     * 检查字段是否可排序
     */
    const isSortable = (fieldPath: string): boolean => {
        if (properties[fieldPath]) {
            return (properties[fieldPath] as any).sortable === true;
        }
        
        for (const [key, val] of Object.entries(properties)) {
            if (fieldPath === key || fieldPath.startsWith(key + '.')) {
                if ((val as any).sortable === true) return true;
            }
        }
        return false;
    };
    
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
        '$geoIntersects', '$geoWithin', '$near', '$nearSphere',
        // 位操作
        '$bitsAllSet', '$bitsAnySet', '$bitsAllClear', '$bitsAnyClear'
    ];
    
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
     */
    const filterSort = (value: any): any => {
        if (!Array.isArray(value)) return [];
        const result: any[] = [];
        
        for (const item of value) {
            if (typeof item === 'string') {
                if (isSortable(item)) {
                    result.push(item);
                } else {
                    errors[item] = new VError('sortable');
                    if (config.pickyMode) {
                        throw new VError('invalidFind', undefined, errors);
                    }
                }
            } else if (typeof item === 'object' && item !== null) {
                const [key, order] = Object.entries(item)[0];
                if (isSortable(key) && (order === 1 || order === -1)) {
                    result.push({ [key]: order });
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
    
    // 处理 skip 和 limit
    result.skip  = skipData  !== undefined && typeof skipData  === 'number' && skipData  >= 0 ? skipData  : 0;
    result.limit = limitData !== undefined && typeof limitData === 'number' && limitData >= 1 ? limitData : 1;
    
    // 处理返回字段 cols
    // cols 结构: {field_name: 0|1}
    // 如没有值为 1 的字段，返回所有 properties 的字段名
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
    
    // 如果有错误且不是忽略错误模式，则抛出异常
    if (Object.keys(errors).length > 0 && !config.ignoreErrors) {
        throw new VError('invalidFind', undefined, errors);
    }
    
    return result;
};
