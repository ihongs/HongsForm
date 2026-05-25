import { Tr, tr } from './i18n.js';

// 表单结构
export interface FormSchema {
    type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'date' | 'null';
    enum?: unknown[];
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
    default?: unknown; // 默认值或默认值生成函数，通过 defaultOn 控制默认值产生时机
    defaultOn?: 'post' | 'patch' | 'always'; // 默认值产生时机，patch 更新时（`patchMode: true`），always 总产生默认值（默认）
    title?: string; // 字段标题
    label?: string;  // 字段标签(用于表单, 默认同 title)
    description?: string; // 字段介绍
    placeholder?: string; // 占位提示(用于表单)
    inputType?: string; // HTML 输入类型及扩展类型，如 text,textarea,number,range,select,check,radio,switch,datetime,date,time,file 及扩展的 tags,image,video 等
}

// 校验参数
export interface FormConfig {
    patchMode?: boolean; // 补充模式, 未给值的字段会跳过, 注意: 只跳过 undefined, 不跳过 null
    pickyMode?: boolean; // 敏感模式, 遇到第一个错即退出
    verifies?: Verify[]; // 默认校验规则集合
}

// 校验状态
export class VState {
    name?: string | number | undefined;
    parent?: VState | undefined;
    values?: object | undefined; // 原始数据
    valids?: object | undefined; // 干净数据

    constructor(name?: string | number | undefined, parent?: VState | undefined) {
        this.name = name;
        this.parent = parent;
    }

    getPath(): string {
        const names: string[] = [];
        let state: VState | undefined = this;
        while (state) {
            if (state.name !== undefined) {
                names.unshift(String(state.name));
            }
            state = state.parent;
        }
        return names.join('.');
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

// 校验错误
export class VError extends Error {
    key: string;
    params?: Record<string, unknown>;
    errors?: Record<string, unknown>;

    constructor(key: string, params?: Record<string, unknown>, errors?: Record<string, unknown>) {
        super(key);
        this.key = key;
        this.params = params;
        this.errors = errors;
    }

    toString (): string {
        return this.getError();
    }

    // 获取顶层错误消息
    getError (translator?: (key: string, params?: Record<string, unknown>) => string): string {
        return translator ? translator(this.key, this.params) : tr(this.key, this.params);
    }

    // 获取字段错误信息
    getErrors(translator?: (key: string, params?: Record<string, unknown>) => string): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        if (this.errors) {
            for (const [key, value] of Object.entries(this.errors)) {
                if (value instanceof VError) {
                    if (value.errors) {
                        result[key] = value.getErrors(translator);
                    } else {
                        result[key] = value.getError (translator);
                    }
                } else {
                    if (value instanceof Tr) {
                        result[key] = translator ? translator(value.key, value.params) : value.toString();
                    } else {
                        result[key] = String(value);
                    }
                }
            }
        }
        return result;
    }

    // 获取错误数据以便 JSON PRC 附加 data
    getData(translator?: (key: string, params?: Record<string, unknown>) => string): Record<string, unknown> {
        return {
            code: "form.invalid",
            error: this.getError(translator),
            errors: this.getErrors(translator)
        };
    }
}

function vEnum(name: string) {
    return Object.freeze({
        toString() {
            throw new Error(`${name} cannot be stringified`);
        },
        toJSON() {
            throw new Error(`${name} cannot be serialized`);
        },
        [Symbol.toPrimitive]() {
            throw new Error(`${name} cannot be converted`);
        },
    });
}

export const VPASS = vEnum('VPASS');
export const VQUIT = vEnum('VQUIT');

// 校验方法
export interface Validate {
    (value: any, schema: any, config: any, state?: VState): any;
}

// 校验规则（判断是否适用某个校验方法）
export interface Verify {
    (schema: any): Validate | undefined
}
