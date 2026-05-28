// 内置默认翻译数据
export const defaultMessages: Record<string, string> = {
  required: 'Required',
  requires: 'Required: {value}',
  array: 'Must be array',
  object: 'Must be object',
  number: 'Must be number',
  integer: 'Must be integer',
  boolean: 'Must be boolean',
  pattern: 'Invalid format',
  format: 'Unknown format: {value}',
  date: 'Invalid date',
  enum: 'Must be one of allowed values',
  items: 'Some items are invalid',
  properties: 'Some properties are invalid',
  minimum: 'Minimum is {value}',
  maximum: 'Maximum is {value}',
  exclusiveMinimum: 'Must be > {value}',
  exclusiveMaximum: 'Must be < {value}',
  minLength: 'Minimum length is {value}',
  maxLength: 'Maximum length is {value}',
  minItems: 'At least {value} items',
  maxItems: 'At most {value} items',
  uniqueItems: 'Duplicate items',
  additionalItems: 'Additional item not allowed',
  minProperties: 'At least {value} properties',
  maxProperties: 'At most {value} properties',
  additionalProperties: 'Additional property not allowed',
  invalid: 'Invalid',
  invalidForm: 'Invalid form',
  invalidFind: 'Invalid find',
  invalidSqls: 'Invalid find',
  findable: 'Nonsupport find',
  sortable: 'Nonsupport sort',
  unsupportedSymbol: 'Unsupported symbol: {value}'
};

// 翻译函数类型
export type Translator = (key: string, params?: Record<string, unknown>) => string;

// 内置默认翻译函数
export function defaultTranslator(key: string, params?: Record<string, unknown>): string {
  const template = defaultMessages[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const value = params?.[k];
    return value !== undefined ? String(value) : '';
  });
}

// 当前翻译函数
let translator: Translator = defaultTranslator;

// 获取当前翻译函数
export function getTranslator(): Translator {
  return translator;
}

// 设置当前翻译函数
export function setTranslator(fn: Translator): void {
  translator = fn;
}

// 延迟翻译
export class Tr {
  constructor(
    readonly key: string,
    readonly params?: Record<string, unknown>
  ) {}

  toString(): string {
    return tr(this.key, this.params);
  }
  toJSON() {
    return this.toString();
  }
  [Symbol.toPrimitive]() {
    return this.toString();
  }
}

// 快捷翻译
export function tr(key: string, params?: Record<string, unknown>): string {
  return translator(key, params);
}
