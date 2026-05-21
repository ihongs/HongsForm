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
    inputType?: string; // HTML 输入类型及扩展类型，如: text,textarea,select,check,radio,range,switch,datetime,date,time,tags,file,image,video 等
    findable?: boolean | string | string[]; // 可查询, 数组指定字段, 对于 type 为 object, true 表示全是, false 表示全否, 默认按下级设置
    sortable?: boolean | string | string[]; // 可排序, 数组指定字段, 对于 type 为 object, true 表示全是, false 表示全否, 默认按下级设置
}

// 校验参数
export interface VModes {
    patchMode?: boolean; // 补充模式, 未给值的字段会跳过, 注意: 只跳过 undefined, 不跳过 null
    pickyMode?: boolean; // 敏感模式, 遇到第一个错即退出
    valids?: object; // 同级已校验的干净数据
    values?: object; // 原始输入数据
    name?: string;
    path?: string;
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

// 特殊常量：跳过当前项，不收集结果
export const VPASS = { __vpass: true };
// 特殊常量：中止当前字段的后续校验
export const VQUIT = { __vquit: true };

// 校验方法
export interface Validate {
    (value: any, schema: any, modes: VModes): any;
}
