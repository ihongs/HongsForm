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

    // 附加、不同
    validate?: Validate | Validate[]; // 校验方法
    default?: unknown; // 默认取值，一个值或多个值或生成函数
    defaultOn?: 'post' | 'patch' | 'over-post' | 'over-patch' | 'over-always'; // over 不管有没有值都赋值
    title?: string; // 字段标题
    label?: string; // 表单标签
    description?: string; // 字段介绍
    placeholder?: string; // 占位提示
    inputType?: string; // 控件类型
    findable?: boolean; // 许可查找
    sortable?: boolean; // 许可排序
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
            code: "invalid",
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
