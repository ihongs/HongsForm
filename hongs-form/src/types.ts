// 表单结构
export interface FormSchema {
    type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';
    enum?: unknown[];
    default?: unknown;
    required?: boolean;

    // 字符串
    format?: string;
    pattern?: string;
    minLength?: number;
    maxLength?: number;

    // 数值
    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;

    // 数组
    items?: FormSchema | FormSchema[];
    additionalItems?: boolean | FormSchema;
    uniqueItems?: boolean;
    minItems?: number;
    maxItems?: number;

    // 对象
    properties?: Record<string, FormSchema>;
    additionalProperties?: boolean | FormSchema;
    minProperties?: number;
    maxProperties?: number;

    // 附加
    validate?: Validate | Validate[]; // 校验方法
    options?: Record<string, string>; // 选项标签, 缺失则与 enum 的值同名
    ignores?: unknown[]; // 忽略选项，用于表单占位，如补充（更新）模式下需要知道某个 check 字段是不变还是没选，丢掉后是空数组，表示用户要清空选项而非不变。适用于古典的 html form，现在的 mvvm 不需要
    title?: string; // 字段标题
    label?: string;  // 字段标签(用于表单, 默认同 title)
    description?: string; // 字段介绍
    placeholder?: string; // 占位提示(用于表单)
    inputType?: string; // HTML 输入类型及扩展类型，如 text,textarea,number,range,select,check,radio,switch,datetime,date,time,file 及扩展的 tags,image,video 等
}

// 校验参数
export interface VModes {
    patchMode?: boolean; // 补充模式, 未给值的字段会跳过, 注意: 只跳过 undefined, 不跳过 null
    pickyMode?: boolean; // 敏感模式, 遇到第一个错即退出
    validates?: Validates[]; // 默认校验方法集合
}

// 校验状态
export class VState {
    name?: string | number | undefined;
    parent?: VState | undefined;
    values?: object | undefined; // 原始数据
    valids?: object | undefined; // 干净数据

    constructor(name: string | number | undefined, parent?: VState | undefined) {
        this.name = name;
        this.parent = parent;
    }

    getPath() {
        // TODO
    };

    getValues(): object | undefined {
        if (this.values !== undefined) {
            return this.values;
        }
        if (this.parent !== undefined) {
            return this.parent.getValues();
        }
    };

    getValids(): object | undefined {
        if (this.valids !== undefined) {
            return this.valids;
        }
        if (this.parent !== undefined) {
            return this.parent.getValids();
        }
    };
}

// 结构化错误：key + params
export interface ErrorMeta {
    key: string;
    params?: Record<string, unknown>;
}

// 校验错误
export class VError extends Error {
    errors?: Record<string, unknown>;
    meta?: ErrorMeta; // 结构化错误元数据

    constructor(message: string, errors?: Record<string, unknown>, meta?: ErrorMeta) {
        super(message);
        this.errors = errors;
        this.meta = meta;
    }

    toMap(translator?: (key: string, params?: Record<string, unknown>) => string): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        if (this.errors) {
            for (const [key, value] of Object.entries(this.errors)) {
                if (value instanceof VError) {
                    // 嵌套 VError，递归展开成层级结构
                    result[key] = value.toMap(translator);
                } else if (typeof value === 'object' && value !== null && (value as ErrorMeta).key) {
                    // 结构化错误，使用翻译函数
                    const meta = value as ErrorMeta;
                    result[key] = translator ? translator(meta.key, meta.params) : meta.key;
                } else {
                    // 其他类型直接赋值
                    result[key] = value;
                }
            }
        }
        return result;
    }
}

function vEnum(name: string) {
    return Object.freeze({
        toString() {
            throw new Error(`VENUM.${name} cannot be stringified`);
        },
        toJSON() {
            throw new Error(`VENUM.${name} cannot be serialized`);
        },
        [Symbol.toPrimitive]() {
            throw new Error(`VENUM.${name} cannot be converted`);
        },
    });
}

export const VENUM = Object.freeze({
    PASS: vEnum('PASS'),
    QUIT: vEnum('QUIT'),
});

// 校验方法
export interface Validate {
    (value: any, schema: any, modes: VModes): any;
}

// 校验方法集合
export interface Validates {
    (schema: any): Validate | undefined
}
