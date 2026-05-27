import { FormSchema, Validate, Verify, VState, VError, VPASS, VQUIT } from './types.js';

// 预设值 (defined)
export const defineds: Validate = function (value: any, schema: any, config: any, state?: VState) {
    let def;
    switch (schema.definedOn) {
    case 'post':
        if (config.patchMode) {
            return VPASS;
        }
        def = schema.defined;
        break;
    case 'patch':
        if (! config.patchMode) {
            return VPASS
        }
        def = schema.defined;
        break;
    case 'always':
    default:
        def = schema.defined;
    }
    if (typeof def === 'function') {
        return def(value, schema, config, state);
    }
    return def;
};

// 默认值 (default)
export const defaults: Validate = function (value: any, schema: any, config: any) {
    if (value === undefined) {
        return schema.default;
    }
    return value;
};

// 可选/非必填 (optional)
export const optional: Validate = function (value: any, schema: any, config: any) {
    if (value === undefined) {
        return VQUIT;
    }
    return value;
};

// 必选/必填 (required)
// patchMode=true 且值为 undefined: 返回 VQUIT 中止后续校验
export const required: Validate = function (value: any, schema: any, config: any) {
    // patchMode 下 undefined：中止后续校验
    if (config.patchMode && value === undefined) {
        return VQUIT;
    }

    // undefined/null/空串
    if (value === undefined || value === null || value === '') {
        throw new VError('required');
    }

    // 空数组
    if (Array.isArray(value) && value.length === 0) {
        throw new VError('required');
    }

    // 空对象
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
        throw new VError('required');
    }

    return value;
};

// 对象属性必填校验 (JSON Schema 风格: schema.required = ['field1', 'field2'])
export const requires: Validate = function (value: any, schema: any, config: any) {
    if (!schema.required || !Array.isArray(schema.required)) return value;
    if (typeof value !== 'object' || value === null) return value;

    const errorFields: string[] = [];
    for (const field of schema.required) {
        if (config.patchMode && value[field] === undefined) continue;
        try {
            required(value[field], {}, config);
        } catch (err) {
            errorFields.push(field);
            if (config.pickyMode) break;
        }
    }

    if (errorFields.length > 0) {
        throw new VError('requires', {value: errorFields.join(', ')});
    }

    return value;
};

export const patterns: Record<string, string> = {
    'date-time': '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})$',
    'date': '^\\d{4}-\\d{2}-\\d{2}$',
    'time': '^\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})?$',
    'duration': '^P(?=\\d|T\\d)(?:\\d+Y)?(?:\\d+M)?(?:\\d+D)?(?:T(?:\\d+H)?(?:\\d+M)?(?:\\d+(?:\\.\\d+)?S)?)?$',
    'email': '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
    'idn-email': '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
    'hostname': '^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$',
    'idn-hostname': '^(?=.{1,253}$)(?:[^\\s.]{1,63}\\.)*[^\\s.]{1,63}$',
    'ipv4': '^(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)$',
    'ipv6': '^(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}$|^::1$|^::$',
    'uuid': '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
    'iri': '^[a-zA-Z][a-zA-Z0-9+.-]*:[^\\s]*$',
    'iri-reference': '^(?:[a-zA-Z][a-zA-Z0-9+.-]*:[^\\s]*|[^\\s]*)$',
    'uri': '^[a-zA-Z][a-zA-Z0-9+.-]*:[^\\s]*$',
    'uri-reference': '^(?:[a-zA-Z][a-zA-Z0-9+.-]*:[^\\s]*|[^\\s]*)$',
    'uri-template': '^[^\\s]*$',
    'json-pointer': '^(?:/(?:[^~/]|~0|~1)*)*$',
    'relative-json-pointer': '^(?:0|[1-9]\\d*)(?:#|(?:/(?:[^~/]|~0|~1)*)*)$',
    'regex': '^[\\s\\S]*$',
};

// 字符串 (type=string)
export const isString: Validate = function (value: any, schema: any, config: any) {
    // null/undefined/空字符串 不处理
    if (value == null || value == '') return value;

    // 转换
    if (typeof value !== 'string') {
        value = String(value);
    }

    // 枚举校验
    if (schema.enum && !schema.enum.includes(value)) {
        throw new VError('enum');
    }

    // 长度校验
    if (schema.minLength != null && value.length < schema.minLength) {
        throw new VError('minLength', { value: schema.minLength });
    }
    if (schema.maxLength != null && value.length > schema.maxLength) {
        throw new VError('maxLength', { value: schema.maxLength });
    }

    // 正则校验，pattern 优先；未配置 pattern 时使用 format 对应的内置 pattern
    const pattern = schema.pattern ?? (schema.format ? patterns[schema.format] : undefined);
    if (schema.format && !schema.pattern && !pattern) {
        throw new VError('format', { value: schema.format });
    }
    if (pattern && !new RegExp(pattern).test(value)) {
        throw new VError('pattern');
    }

    return value;
};

// 数字 (type=number)
export const isNumber: Validate = function (value: any, schema: any, config: any) {
    // null/undefined 不处理
    if (value == null) return value;

    // 转换
    if (typeof value !== 'number') {
        const num = Number(value);
        if (isNaN(num)) {
            throw new VError('number');
        }
        value = num;
    }

    // 范围校验
    if (schema.minimum != null && value < schema.minimum) {
        throw new VError('minimum', { value: schema.minimum });
    }
    if (schema.maximum != null && value > schema.maximum) {
        throw new VError('maximum', { value: schema.maximum });
    }
    if (schema.exclusiveMinimum != null && value <= schema.exclusiveMinimum) {
        throw new VError('exclusiveMinimum', { value: schema.exclusiveMinimum });
    }
    if (schema.exclusiveMaximum != null && value >= schema.exclusiveMaximum) {
        throw new VError('exclusiveMaximum', { value: schema.exclusiveMaximum });
    }

    return value;
};

// 整数 (type=integer)
export const isInteger: Validate = function (value: any, schema: any, config: any) {
    // null/undefined 不处理
    if (value == null) return value;

    // 转换
    if (typeof value !== 'number' || !Number.isInteger(value)) {
        const num = Number(value);
        if (isNaN(num) || !Number.isInteger(num)) {
            throw new VError('integer');
        }
        value = num;
    }

    // 范围校验（复用 number 的逻辑）
    return isNumber(value, schema, config);
};

// 布尔值 (type=boolean)
export const isBoolean: Validate = function (value: any, schema: any, config: any) {
    // null/undefined 不处理
    if (value == null) return value;

    // 已是布尔值直接返回
    if (typeof value === 'boolean') return value;

    // 转换
    if (value === 1 || value === '1' || value === 'true') return true;
    if (value === 0 || value === '0' || value === 'false') return false;

    throw new VError('boolean');
};

// 日期/时间 (inputType=datetime|date|time, 按 type 返回时间戳或格式化字符串, 默认返回 Date 对象)
export const isDateTime: Validate = function (value: any, schema: any, config: any) {
    // null/undefined 不处理
    if (value == null) return value;

    // 已是 Date 对象
    if (value instanceof Date) {
        if (isNaN(value.getTime())) {
            throw new VError('date');
        }
    } else {
        // 转换
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            throw new VError('date');
        }
        value = date;
    }

    // 按 type 返回
    if (schema.type === 'number') {
        return value.getTime(); // 时间戳
    }
    if (schema.type === 'string') {
        if (schema.inputType === 'date') {
            return value.toISOString().split('T')[0];
        }
        if (schema.inputType === 'time') {
            return value.toTimeString().split(' ')[0];
        }
        return value.toISOString();
    }

    return value;
};

// null 类型不处理、不存储
export const isNull: Validate = function (value: any, schema: any, config: any) {
    return VQUIT;
}

// 多选/多填 (type=array)
export const isArray: Validate = function (value: any, schema: any, config: any, state?: VState) {
    // null/undefined 不处理
    if (value == null) return value;

    // 转换
    if (!Array.isArray(value)) {
        if (typeof value === 'string') {
            value = value.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else {
            throw new VError('array');
        }
    }

    // 预校验：数量范围，有错直接抛
    if (schema.minItems != null && value.length < schema.minItems) {
        throw new VError('minItems', { value: schema.minItems });
    }
    if (schema.maxItems != null && value.length > schema.maxItems) {
        throw new VError('maxItems', { value: schema.maxItems });
    }

    // 唯一性校验
    if (schema.uniqueItems) {
        const seen = new Set();
        for (const item of value) {
            const key = typeof item === 'object' ? JSON.stringify(item) : item;
            if (seen.has(key)) {
                throw new VError('uniqueItems');
            }
            seen.add(key);
        }
    }

    // items 逐项校验，收集错误
    if (schema.items) {
        const errors: Record<string, unknown> = {};
        const isTuple = Array.isArray(schema.items);
        const items = isTuple ? schema.items : [schema.items];
        const result: unknown[] = [];

        const ignores = schema.ignores ?? [undefined, null, ''];
        for (let i = 0; i < value.length; i++) {
            // 忽略值：在 ignores 中的不校验也不收集
            if (ignores.includes(value[i])) {
                continue;
            }

            const itemState = new VState(i, state);
            let itemSchema: any;
            if (isTuple) {
                // tuple 校验：取对应索引的 schema，超出长度用 additionalItems
                if (i < items.length) {
                    itemSchema = items[i];
                } else if (schema.additionalItems === false) {
                    // 不允许额外元素
                    errors[String(i)] = new VError('additionalItems');
                    continue;
                } else if (typeof schema.additionalItems === 'object') {
                    // 用 additionalItems schema 校验
                    itemSchema = schema.additionalItems;
                } else {
                    // additionalItems 默认为 true，超出的不校验直接通过
                    result.push(value[i]);
                    continue;
                }
            } else {
                // 非 tuple：所有项都用同一个 schema 校验
                itemSchema = items[0];
            }

            try {
                const val = validate(value[i], itemSchema, config, itemState);
                // undefined 不要收集到结果
                if (val !== undefined) {
                    result.push(val);
                }
            } catch (err) {
                errors[String(i)] = err;
                if (config.pickyMode) break;
            }
        }

        // 有错误就抛
        if (Object.keys(errors).length > 0) {
            throw new VError('items', {}, errors);
        }

        return result;
    }

    return value;
};

// 默认/对象 (type=object)
export const isObject: Validate = function (value: any, schema: any, config: any, state?: VState) {
    // null/undefined 不处理
    if (value == null) return value;

    // 确保是对象
    if (typeof value !== 'object' || Array.isArray(value)) {
        throw new VError('object');
    }

    const result: Record<string, unknown> = { };
    const objectState = state || new VState();
    objectState.valids = result;
    objectState.values = value;

    // 属性数量预校验
    const count = Object.keys(value).length;
    if (schema.minProperties != null && count < schema.minProperties) {
        throw new VError('minProperties', { value: schema.minProperties });
    }
    if (schema.maxProperties != null && count > schema.maxProperties) {
        throw new VError('maxProperties', { value: schema.maxProperties });
    }

    const errors: Record<string, unknown> = {};

    // 按 properties 定义顺序遍历校验，收集错误
    if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
            const fieldState = new VState(key, objectState);
            try {
                const val = validate(value[key], propSchema, config, fieldState);
                // undefined 不要收集到结果
                if (val !== undefined) {
                    result[key] = val;
                }
            } catch (err) {
                errors[key] = err;
                if (config.pickyMode) break;
            }
        }
    }

    // pickyMode 下遇到第一个错误立即中止
    if (config.pickyMode && Object.keys(errors).length > 0) {
        throw new VError('properties', {}, errors);
    }

    // additionalProperties (JSON Schema 规则)
    // true / undefined: 不校验
    // false: 有多余的都挑出来报错
    // schema object: 用该 schema 校验
    if (typeof schema.additionalProperties === 'object') {
        const allowed = new Set(Object.keys(schema.properties || {}));
        for (const key of Object.keys(value)) {
            if (!allowed.has(key)) {
                const fieldState = new VState(key, objectState);
                try {
                    const val = validate(value[key], schema.additionalProperties, config, fieldState);
                    if (val !== undefined) {
                        result[key] = val;
                    }
                } catch (err) {
                    errors[key] = err;
                    if (config.pickyMode) break;
                }
            }
        }
    } else if (schema.additionalProperties === false) {
        const allowed = new Set(Object.keys(schema.properties || {}));
        for (const key of Object.keys(value)) {
            if (!allowed.has(key)) {
                errors[key] = new VError('additionalProperties');
            }
        }
    } else {
        const allowed = new Set(Object.keys(schema.properties || {}));
        for (const [key, val] of Object.entries(value)) {
            if (!allowed.has(key)) {
                result[key] = val;
            }
        }
    }

    // 有错误就抛
    if (Object.keys(errors).length > 0) {
        throw new VError('properties', {}, errors);
    }

    return result;
};

// 校验规则集合。注意：不要将 validate/baseValidate 包装成 verify 并加入 verifies 中，这会导致循环引用。
export const verifies: Verify[] = [
    (schema) => {
        if (schema.defined) {
            return defineds;
        }
        if (schema.default) {
            return defaults;
        }
    },
    (schema) => {
        if (schema.required === undefined
        ||  schema.required === false) {
            return optional;
        }
        if (schema.required === true ) {
            return required;
        }
        // schema.required = ['field1', 'field2']: 对象属性必填 (JSON Schema 风格)
        if (Array.isArray(schema.required)) {
            return requires;
        }
    },
    (schema) => {
        if (schema.type == 'null') {
            return isNull;
        }
        if (schema.type == 'array') {
            return isArray;
        }
        if (schema.type == 'object') {
            return isObject;
        }
        if (schema.type == 'string') {
            return isString;
        }
        if (schema.type == 'number') {
            return isNumber;
        }
        if (schema.type == 'integer') {
            return isInteger;
        }
        if (schema.type == 'boolean') {
            return isBoolean;
        }
        if (schema.type == 'date'
        ||  schema.inputType == 'datetime'
        ||  schema.inputType == 'date'
        ||  schema.inputType == 'time'
        ) {
            return isDateTime;
        }
    },
    (schema) => {
        // 复查一遍，以免上面有清理字符串、删除忽略项等导致值变为空了
        if (schema.required === undefined
        ||  schema.required === false) {
            return optional;
        }
        if (schema.required === true ) {
            return required;
        }
        // schema.required = ['field1', 'field2']: 对象属性必填 (JSON Schema 风格)
        if (Array.isArray(schema.required)) {
            return requires;
        }
    },
];

const validates = function (validateFns: Validate[], value: any, schema: any, config: any, state?: VState) {
    // 依次执行校验
    let result = value;
    for (const fn of validateFns) {
        const r = fn(result, schema, config, state);
        // 遇到 VPASS，跳过当前校验
        if (r === VPASS) {
            continue;
        }
        // 遇到 VQUIT，中止后续校验
        if (r === VQUIT) {
            break;
        }
        result = r;
    }

    return result;
};

// 校验方法
// 未指定 validate 时应用 validates. 注意: 此方法不可放入自定义 validate
export const validate: Validate = function (value: any, schema: any, config: any, state?: VState) {
    // 默认 type 为 object
    const sch = { type: 'object', ...schema };

    // 获取校验函数列表
    let validateFns: Validate[] = [];

    if (sch.validate) {
        validateFns = Array.isArray(sch.validate) ? sch.validate : [sch.validate];
    } else {
        let matchers = config.verifies || verifies;
        for(const fx of matchers) {
            const fn = fx(sch);
            if (fn) validateFns.push(fn);
        }
    }

    return validates(validateFns, value, schema, config, state);
};

// 基础校验方法
// 未指定 validate 时应用 validates. 此方法可以放入自定义 validate
export const baseValidate: Validate = function (value: any, schema: any, config: any, state?: VState) {
    // 默认 type 为 object
    const sch = { type: 'object', ...schema };

    // 获取校验函数列表
    let validateFns: Validate[] = [];

    let matchers = config.verifies || verifies;
    for(const fx of matchers) {
        const fn = fx(sch);
        if (fn) validateFns.push(fn);
    }

    return validates(validateFns, value, schema, config, state);
};

// 校验存储数据
// config.ignoreErrors: 是否忽略校验错误，默认 false
export const validateData = function (values: any, schema: any, config: any, state?: VState) {
    if (config?.ignoreErrors) {
        const saveState = state || new VState();
        try {
            return validate(values, schema, config, saveState);
        } catch (ex) {
            return saveState.getValids() || {};
        }
    }
    return validate(values, schema, config, state);
}
