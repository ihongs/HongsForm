import { FormSchema, Validate, Validates, VModes, VState, VError, VPASS, VQUIT } from './types.js';
import { tr } from './i18n.js';

// 可选/非必填 (optional)
export const optional: Validate = function (value: any, schema: any, modes: VModes) {
    if (value === undefined) {
        return VQUIT;
    }
    return value;
};

// 必选/必填 (required)
// patchMode=true 且值为 undefined: 返回 VQUIT 中止后续校验
export const required: Validate = function (value: any, schema: any, modes: VModes) {
    // patchMode 下 undefined：中止后续校验
    if (modes.patchMode && value === undefined) {
        return VQUIT;
    }

    // undefined/null/空串
    if (value === undefined || value === null || value === '') {
        throw new Error(tr('required'));
    }

    // 空数组
    if (Array.isArray(value) && value.length === 0) {
        throw new Error(tr('required'));
    }

    // 空对象
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
        throw new Error(tr('required'));
    }

    return value;
};

// 对象属性必填校验 (JSON Schema 风格: schema.required = ['field1', 'field2'])
export const requires: Validate = function (value: any, schema: any, modes: VModes) {
    if (!schema.required || !Array.isArray(schema.required)) return value;
    if (typeof value !== 'object' || value === null) return value;

    const errors: Record<string, unknown> = {};
    for (const field of schema.required) {
        if (modes.patchMode && value[field] === undefined) continue;
        try {
            required(value[field], {}, modes);
        } catch (err) {
            errors[field] = err instanceof Error ? err.message : String(err);
            if (modes.patchMode) break;
        }
    }

    if (Object.keys(errors).length > 0) {
        throw new VError(tr('properties'), errors);
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
export const isString: Validate = function (value: any, schema: any, modes: VModes) {
    // null/undefined/空字符串 不处理
    if (value == null || value == '') return value;

    // 转换
    if (typeof value !== 'string') {
        value = String(value);
    }

    // 枚举校验
    if (schema.enum && !schema.enum.includes(value)) {
        throw new Error(tr('enum'));
    }

    // 长度校验
    if (schema.minLength != null && value.length < schema.minLength) {
        throw new Error(tr('minLength', { value: schema.minLength }));
    }
    if (schema.maxLength != null && value.length > schema.maxLength) {
        throw new Error(tr('maxLength', { value: schema.maxLength }));
    }

    // 正则校验，pattern 优先；未配置 pattern 时使用 format 对应的内置 pattern
    const pattern = schema.pattern ?? (schema.format ? patterns[schema.format] : undefined);
    if (schema.format && !schema.pattern && !pattern) {
        throw new Error(tr('format', { value: schema.format }));
    }
    if (pattern && !new RegExp(pattern).test(value)) {
        throw new Error(tr('pattern'));
    }

    return value;
};

// 数字 (type=number)
export const isNumber: Validate = function (value: any, schema: any, modes: VModes) {
    // null/undefined 不处理
    if (value == null) return value;

    // 转换
    if (typeof value !== 'number') {
        const num = Number(value);
        if (isNaN(num)) {
            throw new Error(tr('number'));
        }
        value = num;
    }

    // 范围校验
    if (schema.minimum != null && value < schema.minimum) {
        throw new Error(tr('minimum', { value: schema.minimum }));
    }
    if (schema.maximum != null && value > schema.maximum) {
        throw new Error(tr('maximum', { value: schema.maximum }));
    }
    if (schema.exclusiveMinimum != null && value <= schema.exclusiveMinimum) {
        throw new Error(tr('exclusiveMinimum', { value: schema.exclusiveMinimum }));
    }
    if (schema.exclusiveMaximum != null && value >= schema.exclusiveMaximum) {
        throw new Error(tr('exclusiveMaximum', { value: schema.exclusiveMaximum }));
    }

    return value;
};

// 整数 (type=integer)
export const isInteger: Validate = function (value: any, schema: any, modes: VModes) {
    // null/undefined 不处理
    if (value == null) return value;

    // 转换
    if (typeof value !== 'number' || !Number.isInteger(value)) {
        const num = Number(value);
        if (isNaN(num) || !Number.isInteger(num)) {
            throw new Error(tr('integer'));
        }
        value = num;
    }

    // 范围校验（复用 number 的逻辑）
    return isNumber(value, schema, modes);
};

// 布尔值 (type=boolean)
export const isBoolean: Validate = function (value: any, schema: any, modes: VModes) {
    // null/undefined 不处理
    if (value == null) return value;

    // 已是布尔值直接返回
    if (typeof value === 'boolean') return value;

    // 转换
    if (value === 1 || value === '1' || value === 'true') return true;
    if (value === 0 || value === '0' || value === 'false') return false;

    throw new Error(tr('boolean'));
};

// 日期/时间 (inputType=datetime|date|time, 按 type 返回时间戳或格式化字符串, 默认返回 Date 对象)
export const isDateTime: Validate = function (value: any, schema: any, modes: VModes) {
    // null/undefined 不处理
    if (value == null) return value;

    // 已是 Date 对象
    if (value instanceof Date) {
        if (isNaN(value.getTime())) {
            throw new Error(tr('date'));
        }
    } else {
        // 转换
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            throw new Error(tr('date'));
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
export const isNull: Validate = function (value: any, schema: any, modes: VModes) {
    return VQUIT;
}

// 多选/多填 (type=array)
export const isArray: Validate = function (value: any, schema: any, modes: VModes, state?: VState) {
    // null/undefined 不处理
    if (value == null) return value;

    // 转换
    if (!Array.isArray(value)) {
        if (typeof value === 'string') {
            value = value.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else {
            throw new Error(tr('array'));
        }
    }

    // 预校验：数量范围，有错直接抛
    if (schema.minItems != null && value.length < schema.minItems) {
        throw new Error(tr('minItems', { value: schema.minItems }));
    }
    if (schema.maxItems != null && value.length > schema.maxItems) {
        throw new Error(tr('maxItems', { value: schema.maxItems }));
    }

    // 唯一性校验
    if (schema.uniqueItems) {
        const seen = new Set();
        for (const item of value) {
            const key = typeof item === 'object' ? JSON.stringify(item) : item;
            if (seen.has(key)) {
                throw new Error(tr('uniqueItems'));
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

        const ignores = schema.ignores ?? [null, '', undefined]; // 默认忽略 null, '', undefined
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
                    errors[String(i)] = tr('additionalItems');
                    result.push(value[i]);
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
                const val = validate(value[i], itemSchema, modes, itemState);
                // undefined 不要收集到结果
                if (val !== undefined) {
                    result.push(val);
                }
            } catch (err) {
                // VError 保持原样用于递归展开，普通错误转成 message 字符串
                if (err instanceof VError) {
                    errors[String(i)] = err;
                } else {
                    errors[String(i)] = err instanceof Error ? err.message : String(err);
                }
                result.push(value[i]); // 出错的保留原值
                if (modes.patchMode) break;
            }
        }

        // 替换原数组
        value.splice(0, value.length, ...result);

        // 有错误就抛
        if (Object.keys(errors).length > 0) {
            throw new VError(tr('items'), errors);
        }
    }

    return value;
};

// 默认/对象 (type=object)
export const isObject: Validate = function (value: any, schema: any, modes: VModes, state?: VState) {
    // null/undefined 不处理
    if (value == null) return value;

    // 确保是对象
    if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(tr('object'));
    }

    const result: Record<string, unknown> = { ...value };
    const objectState = new VState(state?.name, state?.parent);
    objectState.valids = result;
    objectState.values = value;

    // 属性数量预校验
    const count = Object.keys(result).length;
    if (schema.minProperties != null && count < schema.minProperties) {
        throw new Error(tr('minProperties', { value: schema.minProperties }));
    }
    if (schema.maxProperties != null && count > schema.maxProperties) {
        throw new Error(tr('maxProperties', { value: schema.maxProperties }));
    }

    const errors: Record<string, unknown> = {};

    // 按 properties 定义顺序遍历校验，收集错误
    if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
            const fieldState = new VState(key, objectState);
            try {
                const val = validate(result[key], propSchema, modes, fieldState);
                // undefined 不要收集到结果
                if (val !== undefined) {
                    result[key] = val;
                } else {
                    delete result[key];
                }
            } catch (err) {
                // VError 保持原样用于递归展开，普通错误转成 message 字符串
                if (err instanceof VError) {
                    errors[key] = err;
                } else {
                    errors[key] = err instanceof Error ? err.message : String(err);
                }
                // patchMode 下遇到第一个错误立即中止
                if (modes.patchMode) break;
            }
        }
    }

    // additionalProperties (JSON Schema 规则)
    // undefined / true: 保留不校验
    // false: 报错，收集错误
    // schema object: 用该 schema 校验
    if (schema.additionalProperties === false) {
        const allowed = new Set(Object.keys(schema.properties || {}));
        for (const key of Object.keys(result)) {
            if (!allowed.has(key)) {
                errors[key] = tr('additionalProperties');
            }
        }
    } else if (typeof schema.additionalProperties === 'object') {
        const allowed = new Set(Object.keys(schema.properties || {}));
        for (const key of Object.keys(result)) {
            if (!allowed.has(key)) {
                const fieldState = new VState(key, objectState);
                try {
                    const val = validate(result[key], schema.additionalProperties, modes, fieldState);
                    if (val !== undefined) {
                        result[key] = val;
                    } else {
                        delete result[key];
                    }
                } catch (err) {
                    // VError 保持原样用于递归展开，普通错误转成 message 字符串
                    if (err instanceof VError) {
                        errors[key] = err;
                    } else {
                        errors[key] = err instanceof Error ? err.message : String(err);
                    }
                    if (modes.patchMode) break;
                }
            }
        }
    }

    // 有错误就抛
    if (Object.keys(errors).length > 0) {
        throw new VError(tr('properties'), errors);
    }

    return result;
};

// 核心校验规则
export const coreValidates: Validates[] = [
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
    },
    (schema) => {
        // schema.required = ['field1', 'field2']: 对象属性必填 (JSON Schema 风格)
        if (Array.isArray(schema.required)) {
            return requires;
        }
        if (schema.required === true) {
            return required;
        }
        if (schema.required === false
        ||  schema.required === undefined ) {
            return optional;
        }
    }
];

// 扩展校验规则
export const moreValidates: Validates[] = [
    (schema) => {
        if (schema.type == 'string') {
            return isString;
        }
    },
    (schema) => {
        if (schema.type == 'number') {
            return isNumber;
        }
    },
    (schema) => {
        if (schema.type == 'integer') {
            return isInteger;
        }
    },
    (schema) => {
        if (schema.type == 'boolean') {
            return isBoolean;
        }
    },
    (schema) => {
        if (schema.inputType == 'datetime'
        ||  schema.inputType == 'date'
        ||  schema.inputType == 'time'
        ) {
            return isDateTime;
        }
    }
];

const validates = function (validateFns: Validate[], value: any, schema: any, modes: VModes, state?: VState) {
    // 默认 type 为 object
    const sch = { type: 'object', ...schema };

    // 依次执行校验
    let result = value;
    for (const fn of validateFns) {
        const r = fn(result, sch, modes, state);
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

// 校验方法, 未指定 validate 时应用 validates. 注意: 此方法不可放入自定义 validate
export const validate: Validate = function (value: any, schema: any, modes: VModes, state?: VState) {
    // 默认 type 为 object
    const sch = { type: 'object', ...schema };

    // 获取校验函数列表
    let validateFns: Validate[] = [];

    if (sch.validate) {
        validateFns = Array.isArray(sch.validate) ? sch.validate : [sch.validate];
    } else
    if (modes.validates) {
        // 从内部 validates 中匹配
        for (const matcher of modes.validates) {
            const fn = matcher(sch);
            if (fn) validateFns.push(fn);
        }
    } else {
        // 从外部 validates 中匹配
        for (const matcher of coreValidates) {
            const fn = matcher(sch);
            if (fn) validateFns.push(fn);
        }
        for (const matcher of moreValidates) {
            const fn = matcher(sch);
            if (fn) validateFns.push(fn);
        }
    }

    return validates(validateFns, value, schema, modes, state);
};

// 核心校验, 用于自定义 validate: [coreValidate, yourValidate]
export const coreValidate: Validate = function(value: any, schema: any, modes: VModes, state?: VState) {
    // 默认 type 为 object
    const sch = { type: 'object', ...schema };

    // 获取校验函数列表
    let validateFns: Validate[] = [];

    // 从 verifies 中匹配
    for (const matcher of coreValidates) {
        const fn = matcher(sch);
        if (fn) validateFns.push(fn);
    }

    return validates(validateFns, value, schema, modes, state);
}

// 扩展校验, 用于自定义 validate: [moreValidate, yourValidate]
export const moreValidate: Validate = function(value: any, schema: any, modes: VModes, state?: VState) {
    // 默认 type 为 object
    const sch = { type: 'object', ...schema };

    // 获取校验函数列表
    let validateFns: Validate[] = [];

    // 从 verifies 中匹配
    for (const matcher of moreValidates) {
        const fn = matcher(sch);
        if (fn) validateFns.push(fn);
    }

    return validates(validateFns, value, schema, modes, state);
}

// form schema 的 input 校验
export const isInput: Validate = function(value: any, schema: any, modes: VModes) {
    if (!value.type) {
        switch (value.inputType) {
            case 'legend':
            case 'figure':
                value.type = 'null';
                break;
        }
    }
    return value;
};

// form schema 的 schema
export const formStruct: FormSchema = {
    type: 'object',
    properties: {
        title: { type: 'string', required: true },
        description: { type: 'string' },
        properties: {
            type: 'object',
            required: true,
            properties: {},
            additionalProperties: {
                type: 'object',
                properties: {
                    title: { type: 'string', required: true },
                    description: { type: 'string' },
                    label: { type: 'string' },
                    placeholder: { type: 'string' },
                    type: { type: 'string', enum: ['string', 'number', 'integer', 'boolean', 'array', 'null'] },
                    required: { type: 'boolean' },
                    format: { type: 'string' },
                    pattern: { type: 'string' },
                    minimum: { type: 'number' },
                    maximum: { type: 'number' },
                    minItems: { type: 'number' },
                    maxItems: { type: 'number' },
                    enum: {
                        type: 'array'
                    },
                    items: {
                        type: 'object'
                    },
                    options: {
                        type: 'object',
                        properties: {},
                        additionalProperties: { type: 'string' }
                    },
                    inputType: {
                        type: 'string',
                        enum: ['text', 'email', 'phone', 'textarea', 'number', 'range', 'select', 'check', 'radio', 'switch', 'datetime', 'date', 'time', 'file', 'legend', 'figure'],
                    }
                },
                validate: [ isObject, isInput ]
            }
        }
    }
};

// form schema 校验
export function formValidate(schema: any) {
    return validate(schema, formStruct, {});
}
